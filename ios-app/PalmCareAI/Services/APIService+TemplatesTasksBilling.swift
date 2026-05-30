import Foundation

extension APIService {
    func fetchTemplates() async throws -> [ContractTemplateItem] {
        try await request("GET", path: "/contract-templates/?active_only=false")
    }

    func fetchTemplate(id: String) async throws -> ContractTemplateDetail {
        try await request("GET", path: "/contract-templates/\(id)")
    }

    func deleteTemplate(id: String) async throws {
        try await requestVoid("DELETE", path: "/contract-templates/\(id)")
    }

    func rescanTemplate(id: String) async throws -> ContractTemplateDetail {
        try await request("POST", path: "/contract-templates/\(id)/rescan")
    }

    /// Upload a contract template (PDF or DOCX) for OCR scanning and field detection.
    func uploadTemplate(fileData: Data, filename: String, name: String, description: String?) async throws -> TemplateUploadResponse {
        let url = try validatedURL(path: "/contract-templates/upload")

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
        body.appendString("Content-Disposition: form-data; name=\"name\"\r\n\r\n")
        body.appendString("\(name)\r\n")

        if let desc = description, !desc.isEmpty {
            body.appendString("--\(boundary)\r\n")
            body.appendString("Content-Disposition: form-data; name=\"description\"\r\n\r\n")
            body.appendString("\(desc)\r\n")
        }

        let mimeType = filename.lowercased().hasSuffix(".pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        body.appendString("Content-Type: \(mimeType)\r\n\r\n")
        body.append(fileData)
        body.appendString("\r\n--\(boundary)--\r\n")

        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

        if http.statusCode == 401 {
            await MainActor.run { self.token = nil }
            throw APIError.unauthorized
        }
        guard (200...299).contains(http.statusCode) else {
            if let err = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(err.detail ?? err.message ?? "Upload failed")
            }
            throw APIError.serverError("Upload failed (\(http.statusCode))")
        }

        return try jsonDecoder.decode(TemplateUploadResponse.self, from: data)
    }

    // MARK: - Tasks

    func fetchTasks() async throws -> [TaskItem] {
        try await request("GET", path: "/notes/tasks")
    }

    func createTask(_ task: TaskCreate) async throws -> TaskItem {
        var body: [String: Any] = ["title": task.title]
        if let d = task.description { body["description"] = d }
        if let s = task.status { body["status"] = s }
        if let p = task.priority { body["priority"] = p }
        if let dd = task.due_date { body["due_date"] = dd }
        if let c = task.related_client_id { body["related_client_id"] = c }
        return try await request("POST", path: "/notes/tasks", body: body)
    }

    func updateTask(id: String, body: [String: Any]) async throws -> TaskItem {
        try await request("PUT", path: "/notes/tasks/\(id)", body: body)
    }

    func completeTask(id: String) async throws -> TaskItem {
        try await request("PUT", path: "/notes/tasks/\(id)/complete")
    }

    func deleteTask(id: String) async throws {
        try await requestVoid("DELETE", path: "/notes/tasks/\(id)")
    }

    // MARK: - Billing & Subscription

    func fetchSubscription() async throws -> SubscriptionResponse {
        try await request("GET", path: "/billing/subscription")
    }

    func fetchPlans() async throws -> [SubscriptionPlan] {
        try await request("GET", path: "/billing/plans")
    }

    func createCheckout(planId: String, billingCycle: String = "monthly") async throws -> CheckoutResponse {
        try await request("POST", path: "/billing/checkout", body: [
            "plan_id": planId,
            "billing_cycle": billingCycle
        ])
    }

    func fetchUsage() async throws -> UserSubscription {
        try await request("GET", path: "/visits/usage")
    }

    // MARK: - Forgot Password
    
    func forgotPassword(email: String) async throws {
        let _: [String: AnyCodable] = try await request("POST", path: "/auth/forgot-password", body: ["email": email], noAuth: true)
    }

    // MARK: - Account Deletion (App Store Guideline 5.1.1(v))

    /// Permanently delete the authenticated account and all associated data.
    /// Backend enforces password re-auth and the literal "DELETE MY ACCOUNT" confirmation.
    /// On success, performs a full local wipe (token + recordings + cached
    /// calendar data + temp files) to satisfy Apple Guideline 5.1.1(v).
    func deleteAccount(password: String) async throws {
        let _: [String: AnyCodable] = try await request(
            "POST",
            path: "/auth/delete-account",
            body: [
                "password": password,
                "confirmation": "DELETE MY ACCOUNT",
            ]
        )
        // logout() clears the keychain token, in-memory caches, the
        // Recordings/ directory, and the tmp directory.
        await MainActor.run { self.logout() }
    }
    
    // MARK: - Profile
    
    func updateProfile(body: [String: Any]) async throws -> User {
        try await request("PUT", path: "/auth/business/profile", body: body)
    }
    
    // MARK: - Calendar API
    
    func fetchCalendarEvents(startDate: String? = nil, endDate: String? = nil) async throws -> [APICalendarEvent] {
        var path = "/calendar/events"
        var params: [String] = []
        if let s = startDate { params.append("start_date=\(s)") }
        if let e = endDate { params.append("end_date=\(e)") }
        if !params.isEmpty { path += "?" + params.joined(separator: "&") }
        return try await request("GET", path: path)
    }
    
    func createCalendarEvent(body: [String: Any]) async throws -> APICalendarEvent {
        try await request("POST", path: "/calendar/events", body: body)
    }
    
    func deleteCalendarEvent(eventId: String) async throws {
        try await requestVoid("DELETE", path: "/calendar/events/\(eventId)")
    }
    
    func getCalendarStatus() async throws -> CalendarConnectionStatus {
        try await request("GET", path: "/calendar/status")
    }

    // MARK: - Admin / Outreach

}
