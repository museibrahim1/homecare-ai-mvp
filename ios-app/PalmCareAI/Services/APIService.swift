import Foundation
import Security

class APIService: ObservableObject {
    static let shared = APIService()
    let baseURL: String = {
        if let url = Bundle.main.infoDictionary?["API_BASE_URL"] as? String, !url.isEmpty {
            return url
        }
        return "https://api-production-a0a2.up.railway.app"
    }()

    @Published var token: String? {
        didSet {
            if let token = token {
                KeychainHelper.save(token)
            } else {
                KeychainHelper.delete()
                clearCache()
            }
        }
    }

    var isAuthenticated: Bool { token != nil }

    // MARK: - In-Memory Cache

    private struct CacheEntry<T> {
        let value: T
        let timestamp: Date
        func isValid(ttl: TimeInterval) -> Bool {
            Date().timeIntervalSince(timestamp) < ttl
        }
    }

    private var cachedClients: CacheEntry<[Client]>?
    private var cachedVisits: CacheEntry<[Visit]>?
    private var cachedUser: CacheEntry<User>?
    private let cacheTTL: TimeInterval = 30 // 30 seconds
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.waitsForConnectivity = false
        return URLSession(configuration: config)
    }()

    func clearCache() {
        cachedClients = nil
        cachedVisits = nil
        cachedUser = nil
    }

    func invalidateClients() { cachedClients = nil }
    func invalidateVisits() { cachedVisits = nil }

    init() {
        if let keychainToken = KeychainHelper.load() {
            token = keychainToken
        } else if let legacyToken = UserDefaults.standard.string(forKey: "auth_token") {
            token = legacyToken
            KeychainHelper.save(legacyToken)
            UserDefaults.standard.removeObject(forKey: "auth_token")
        }
    }

    #if DEBUG
    func autoLoginDemoIfNeeded() {
        guard token == nil else { return }
        guard let email = Bundle.main.infoDictionary?["DEMO_EMAIL"] as? String, !email.isEmpty,
              let pass = Bundle.main.infoDictionary?["DEMO_PASSWORD"] as? String, !pass.isEmpty else { return }
        Task {
            let url = URL(string: "\(baseURL)/auth/login")!
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.addValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["email": email, "password": pass])
            guard let (data, _) = try? await URLSession.shared.data(for: req),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let t = json["access_token"] as? String else { return }
            await MainActor.run { self.token = t }
        }
    }
    #endif

    private let sharedDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    private var jsonDecoder: JSONDecoder { sharedDecoder }

    private func isAllowedURL(_ url: URL) -> Bool {
        if url.scheme?.lowercased() == "https" {
            return true
        }
#if DEBUG
        if url.scheme?.lowercased() == "http",
           let host = url.host?.lowercased(),
           host == "localhost" || host == "127.0.0.1" {
            return true
        }
#endif
        return false
    }

    private func validatedURL(path: String) throws -> URL {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        guard isAllowedURL(url) else {
            throw APIError.serverError("Insecure connection blocked.")
        }
        return url
    }

    func request<T: Decodable>(_ method: String, path: String, body: [String: Any]? = nil, noAuth: Bool = false, allowSoftUnauthorized: Bool = false) async throws -> T {
        let url = try validatedURL(path: path)

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        request.cachePolicy = .reloadIgnoringLocalCacheData

        if !noAuth, let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            if allowSoftUnauthorized {
                if let errorBody = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                    throw APIError.serverError(errorBody.detail ?? errorBody.message ?? "Not authorized")
                }
                throw APIError.serverError("Not authorized for this resource")
            }
            await MainActor.run { self.token = nil }
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.detail ?? errorBody.message ?? "Request failed")
            }
            throw APIError.serverError("Something went wrong. Please try again.")
        }

        return try jsonDecoder.decode(T.self, from: data)
    }

    func requestVoid(_ method: String, path: String, body: [String: Any]? = nil) async throws {
        let url = try validatedURL(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
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
                throw APIError.serverError(errorBody.detail ?? errorBody.message ?? "Request failed")
            }
            throw APIError.serverError("Something went wrong. Please try again.")
        }
    }

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

    func register(body: [String: Any]) async throws {
        let _: RegisterResponse = try await request("POST", path: "/auth/business/register", body: body, noAuth: true)
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
            let bodyStr = String(data: data, encoding: .utf8) ?? ""
            throw APIError.serverError("Upload failed (\(httpResponse.statusCode)): \(bodyStr.prefix(200))")
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
        body.appendString("Content-Disposition: form-data; name=\"file\"; filename=\"chunk.m4a\"\r\n")
        body.appendString("Content-Type: audio/m4a\r\n\r\n")
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
        try data.write(to: fileURL, options: .atomic)
        return fileURL
    }

    // MARK: - Contract Templates

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

    func fetchWeeklyPlan(weekOffset: Int = 0) async throws -> OutreachWeeklyPlan {
        let url = URL(string: "\(baseURL)/platform/outreach/weekly-plan?week_offset=\(weekOffset)")!
        var req = URLRequest(url: url)
        req.addValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard http.statusCode == 200 else { throw APIError.serverError("Failed to load weekly plan") }
        return try JSONDecoder().decode(OutreachWeeklyPlan.self, from: data)
    }

    func approveDraft(draftId: Int, type: String) async throws {
        let url = URL(string: "\(baseURL)/platform/outreach/approve-draft/\(draftId)?type=\(type)")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200...299).contains(http.statusCode) else { throw APIError.serverError("Failed to approve draft") }
    }

    func markCalled(leadId: Int, notes: String?) async throws {
        let url = URL(string: "\(baseURL)/platform/outreach/mark-called")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["lead_id": leadId, "notes": notes ?? ""]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200...299).contains(http.statusCode) else { throw APIError.serverError("Failed to mark called") }
    }

    func batchSendEmails(dayIndex: Int, weekOffset: Int = 0) async throws -> BatchSendResponse {
        let url = URL(string: "\(baseURL)/platform/outreach/batch-send")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["day_index": dayIndex, "week_offset": weekOffset, "types": ["agency", "investor"]]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard http.statusCode == 200 else { throw APIError.serverError("Failed to batch send") }
        return try JSONDecoder().decode(BatchSendResponse.self, from: data)
    }

    func fetchSalesLeads(page: Int = 0, limit: Int = 50) async throws -> [SalesLead] {
        let url = URL(string: "\(baseURL)/platform/sales/leads?skip=\(page * limit)&limit=\(limit)")!
        var req = URLRequest(url: url)
        req.addValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard http.statusCode == 200 else { throw APIError.serverError("Failed to load leads") }
        if let wrapper = try? JSONDecoder().decode(SalesLeadsResponse.self, from: data) {
            return wrapper.leads ?? wrapper.items ?? []
        }
        return try JSONDecoder().decode([SalesLead].self, from: data)
    }

    func fetchInvestors() async throws -> [InvestorRecord] {
        let url = URL(string: "\(baseURL)/platform/investors/")!
        var req = URLRequest(url: url)
        req.addValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard http.statusCode == 200 else { throw APIError.serverError("Failed to load investors") }
        return try JSONDecoder().decode([InvestorRecord].self, from: data)
    }

    // MARK: - Logout

    func logout() {
        token = nil

        UserDefaults.standard.removeObject(forKey: "palmcare_calendar_events")
        UserDefaults.standard.removeObject(forKey: "googleCalendarConnected")
        URLCache.shared.removeAllCachedResponses()

        let fm = FileManager.default
        let recordingsDir = fm.urls(for: .documentDirectory, in: .userDomainMask).first?.appendingPathComponent("Recordings")
        if let dir = recordingsDir, fm.fileExists(atPath: dir.path) {
            try? fm.removeItem(at: dir)
        }
        let tmpDir = fm.temporaryDirectory
        if let files = try? fm.contentsOfDirectory(atPath: tmpDir.path) {
            for file in files {
                try? fm.removeItem(at: tmpDir.appendingPathComponent(file))
            }
        }
    }
}

// MARK: - Error Types

struct ErrorResponse: Codable {
    let detail: String?
    let message: String?
}

struct RegisterResponse: Codable {
    let business_id: String?
    let message: String?
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Unable to connect. Please try again."
        case .invalidResponse: return "We received an unexpected response. Please try again."
        case .unauthorized: return "Session expired. Please log in again."
        case .serverError(let msg):
            if msg.contains("{") || msg.contains("status") || msg.count > 120 {
                return "Something went wrong. Please try again."
            }
            return msg
        }
    }
}

private enum KeychainHelper {
    private static let service = "com.palmcare.ai"
    private static let tokenKey = "auth_token"

    static func save(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            // Keep auth tokens device-bound and unavailable in backups/migrations.
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        SecItemDelete(query as CFDictionary)
        var addQuery = query
        addQuery[kSecValueData as String] = data
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    static func load() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

private extension Data {
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
