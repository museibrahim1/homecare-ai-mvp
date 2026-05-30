import Foundation

extension APIService {
    // MARK: - Auth

    func login(email: String, password: String) async throws -> LoginResponse {
        do {
            return try await request("POST", path: "/auth/login", body: ["email": email, "password": password], noAuth: true)
        } catch {
            // If regular auth fails, try business auth (matches web app behavior)
            do {
                let bizResponse: BusinessLoginResponse = try await request(
                    "POST", path: "/auth/business/login",
                    body: ["email": email, "password": password], noAuth: true
                )
                return LoginResponse(
                    access_token: bizResponse.access_token,
                    token_type: bizResponse.token_type,
                    requires_mfa: nil,
                    mfa_token: nil
                )
            } catch {
                // Both failed — throw the original regular auth error
                throw error
            }
        }
    }

    func fetchUser(forceRefresh: Bool = false) async throws -> User {
        if !forceRefresh, let cached = cachedUser, cached.isValid(ttl: cacheTTL) {
            return cached.value
        }
        let user: User = try await request("GET", path: "/auth/me")
        cachedUser = CacheEntry(value: user, timestamp: Date())
        return user
    }

    /// Register a new business. The simplified backend returns an access_token
    /// directly so the user is signed in immediately — no second login call needed.
    @discardableResult
    func register(body: [String: Any]) async throws -> RegisterResponse {
        let response: RegisterResponse = try await request(
            "POST", path: "/auth/business/register", body: body, noAuth: true
        )
        if let access = response.access_token, !access.isEmpty {
            await MainActor.run { self.token = access }
        }
        return response
    }

    /// Request a one-time magic sign-in link sent to the user's email.
    /// Backend always returns 200 to prevent enumeration.
    func requestMagicLink(email: String) async throws {
        let _: [String: AnyCodable] = try await request(
            "POST",
            path: "/auth/business/magic-link/request",
            body: ["email": email],
            noAuth: true
        )
    }

    /// Exchange a magic-link token (deep-linked from email) for a session.
    func verifyMagicLink(token: String) async throws {
        let response: BusinessLoginResponse = try await request(
            "POST",
            path: "/auth/business/magic-link/verify",
            body: ["token": token],
            noAuth: true
        )
        await MainActor.run {
            if !response.access_token.isEmpty {
                self.token = response.access_token
            }
        }
    }

    // MARK: - Clients

    func fetchClients(forceRefresh: Bool = false) async throws -> [Client] {
        if !forceRefresh, let cached = cachedClients, cached.isValid(ttl: cacheTTL) {
            return cached.value
        }
        let clients: [Client] = try await request("GET", path: "/clients")
        cachedClients = CacheEntry(value: clients, timestamp: Date())
        return clients
    }

    func createClient(body: [String: Any]) async throws -> Client {
        let client: Client = try await request("POST", path: "/clients", body: body)
        invalidateClients()
        return client
    }

    func updateClient(id: String, body: [String: Any]) async throws -> Client {
        let client: Client = try await request("PUT", path: "/clients/\(id)", body: body)
        invalidateClients()
        return client
    }

    // MARK: - Visits

    func fetchVisits(forceRefresh: Bool = false) async throws -> [Visit] {
        if !forceRefresh, let cached = cachedVisits, cached.isValid(ttl: cacheTTL) {
            return cached.value
        }
        let wrapper: VisitListResponse = try await request("GET", path: "/visits")
        cachedVisits = CacheEntry(value: wrapper.items, timestamp: Date())
        return wrapper.items
    }

    func createVisit(clientId: String) async throws -> Visit {
        let visit: Visit = try await request("POST", path: "/visits", body: ["client_id": clientId])
        invalidateVisits()
        return visit
    }

    func fetchVisit(id: String) async throws -> Visit {
        try await request("GET", path: "/visits/\(id)")
    }

    // MARK: - Audio Upload

    func uploadAudio(visitId: String, audioData: Data, filename: String, autoProcess: Bool = true) async throws -> UploadResponse {
        let url = try validatedURL(path: "/uploads/audio")

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()

        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"visit_id\"\r\n\r\n")
        body.appendString("\(visitId)\r\n")

        if autoProcess {
            body.appendString("--\(boundary)\r\n")
            body.appendString("Content-Disposition: form-data; name=\"auto_process\"\r\n\r\n")
            body.appendString("true\r\n")
        }

        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        let audioMime: String
        if filename.lowercased().hasSuffix(".wav") {
            audioMime = "audio/wav"
        } else if filename.lowercased().hasSuffix(".mp3") {
            audioMime = "audio/mpeg"
        } else {
            audioMime = "audio/m4a"
        }
        body.appendString("Content-Type: \(audioMime)\r\n\r\n")
        body.append(audioData)
        body.appendString("\r\n--\(boundary)--\r\n")

        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            await MainActor.run { self.token = nil }
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.detail ?? errorBody.message ?? "Upload failed")
            }
            throw APIError.serverError("Upload failed (\(httpResponse.statusCode))")
        }

        return try jsonDecoder.decode(UploadResponse.self, from: data)
    }

    // MARK: - Visit Detail

    func fetchVisitTranscript(visitId: String) async throws -> VisitTranscriptResponse {
        try await request("GET", path: "/visits/\(visitId)/transcript")
    }

    func fetchVisitBillables(visitId: String) async throws -> VisitBillablesResponse {
        try await request("GET", path: "/visits/\(visitId)/billables")
    }

    func fetchVisitNote(visitId: String) async throws -> VisitNote {
        try await request("GET", path: "/visits/\(visitId)/note")
    }

    func fetchVisitContract(visitId: String) async throws -> VisitContract {
        try await request("GET", path: "/visits/\(visitId)/contract")
    }

    func approveBillableItem(visitId: String, itemId: String) async throws -> BillableItem {
        try await request("PUT", path: "/visits/\(visitId)/billables/\(itemId)", body: ["is_approved": true])
    }

    func denyBillableItem(visitId: String, itemId: String) async throws -> BillableItem {
        try await request("PUT", path: "/visits/\(visitId)/billables/\(itemId)", body: ["is_flagged": true, "flag_reason": "Denied by user"])
    }

}
