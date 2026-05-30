import Foundation

extension APIService {
    func listContractTemplates() async throws -> [ContractTemplate] {
        try await request("GET", path: "/contract-templates/")
    }

    func runPipelineStep(visitId: String, step: String) async throws {
        let _: [String: AnyCodable] = try await request("POST", path: "/pipeline/visits/\(visitId)/\(step)")
    }

    func restartVisit(visitId: String) async throws {
        let _: [String: AnyCodable] = try await request("POST", path: "/visits/\(visitId)/restart")
    }

    // MARK: - Pipeline

    func getPipelineStatus(visitId: String) async throws -> PipelineStatusResponse {
        try await request("GET", path: "/pipeline/visits/\(visitId)/status")
    }

    // MARK: - Live Transcription

    func liveTranscribe(audioData: Data, diarize: Bool = true) async throws -> LiveTranscriptResponse {
        let url = try validatedURL(path: "/live/transcribe?language=en&diarize=\(diarize)")

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"file\"; filename=\"chunk.wav\"\r\n")
        body.appendString("Content-Type: audio/wav\r\n\r\n")
        body.append(audioData)
        body.appendString("\r\n--\(boundary)--\r\n")

        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.detail ?? errorBody.message ?? "Transcription failed")
            }
            throw APIError.serverError("Transcription failed (\(httpResponse.statusCode))")
        }

        return try jsonDecoder.decode(LiveTranscriptResponse.self, from: data)
    }

    // MARK: - Google Calendar Integration

    func connectGoogleCalendar() async throws -> Bool {
        try await checkGoogleCalendarStatus()
    }

    func checkGoogleCalendarStatus() async throws -> Bool {
        let result: [String: AnyCodable] = try await request("GET", path: "/calendar/status", allowSoftUnauthorized: true)
        return (result["connected"]?.value as? Bool) ?? false
    }

    func disconnectGoogleCalendar() async throws {
        try await requestVoid("POST", path: "/calendar/disconnect")
    }

    // MARK: - Documents

    func fetchDocuments() async throws -> DocumentsResponse {
        try await request("GET", path: "/documents")
    }

    /// Download a file from an API path with authentication, saving to a temp file.
    /// Returns the local file URL on success.
    func downloadFile(path: String, suggestedFilename: String) async throws -> URL {
        let fullPath = path.hasPrefix("http") ? path : "\(baseURL)\(path)"
        guard let url = URL(string: fullPath) else { throw APIError.invalidURL }
        guard isAllowedURL(url) else { throw APIError.serverError("Insecure connection blocked.") }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 60
        req.cachePolicy = .reloadIgnoringLocalCacheData
        if let token = token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

        if http.statusCode == 401 {
            await MainActor.run { self.token = nil }
            throw APIError.unauthorized
        }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.serverError("Download failed (\(http.statusCode))")
        }

        let tmpDir = FileManager.default.temporaryDirectory
        let fileURL = tmpDir.appendingPathComponent(suggestedFilename)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
        return fileURL
    }

    // MARK: - Contract Templates

}
