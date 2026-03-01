import Foundation

class APIService: ObservableObject {
    static let shared = APIService()
    let baseURL = "https://api-production-a0a2.up.railway.app"

    @Published var token: String? {
        didSet {
            if let token = token {
                UserDefaults.standard.set(token, forKey: "auth_token")
            } else {
                UserDefaults.standard.removeObject(forKey: "auth_token")
            }
        }
    }

    var isAuthenticated: Bool { token != nil }

    init() {
        token = UserDefaults.standard.string(forKey: "auth_token")
    }

    private var jsonDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        return decoder
    }

    func request<T: Decodable>(_ method: String, path: String, body: [String: Any]? = nil, noAuth: Bool = false, allowSoftUnauthorized: Bool = false) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        if !noAuth, let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

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
            let bodyStr = String(data: data, encoding: .utf8) ?? ""
            throw APIError.serverError("Request failed (\(httpResponse.statusCode)): \(bodyStr.prefix(200))")
        }

        return try jsonDecoder.decode(T.self, from: data)
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> LoginResponse {
        try await request("POST", path: "/auth/login", body: ["email": email, "password": password], noAuth: true)
    }

    func fetchUser() async throws -> User {
        try await request("GET", path: "/auth/me")
    }

    func register(body: [String: Any]) async throws {
        let _: RegisterResponse = try await request("POST", path: "/auth/business/register", body: body, noAuth: true)
    }

    // MARK: - Clients

    func fetchClients() async throws -> [Client] {
        try await request("GET", path: "/clients")
    }

    func createClient(body: [String: Any]) async throws -> Client {
        try await request("POST", path: "/clients", body: body)
    }

    // MARK: - Visits

    func fetchVisits() async throws -> [Visit] {
        let wrapper: VisitListResponse = try await request("GET", path: "/visits")
        return wrapper.items
    }

    func createVisit(clientId: String) async throws -> Visit {
        try await request("POST", path: "/visits", body: ["client_id": clientId])
    }

    func fetchVisit(id: String) async throws -> Visit {
        try await request("GET", path: "/visits/\(id)")
    }

    // MARK: - Audio Upload

    func uploadAudio(visitId: String, audioData: Data, filename: String, autoProcess: Bool = true) async throws -> UploadResponse {
        guard let url = URL(string: "\(baseURL)/uploads/audio") else {
            throw APIError.invalidURL
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"visit_id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(visitId)\r\n".data(using: .utf8)!)

        if autoProcess {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"auto_process\"\r\n\r\n".data(using: .utf8)!)
            body.append("true\r\n".data(using: .utf8)!)
        }

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
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

    // MARK: - Pipeline

    func getPipelineStatus(visitId: String) async throws -> Visit {
        try await request("GET", path: "/pipeline/visits/\(visitId)/status")
    }

    // MARK: - Live Transcription

    func liveTranscribe(audioData: Data, diarize: Bool = true) async throws -> LiveTranscriptResponse {
        guard let url = URL(string: "\(baseURL)/live/transcribe?language=en&diarize=\(diarize)") else {
            throw APIError.invalidURL
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"chunk.m4a\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
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
        let result: [String: AnyCodable] = try await request("GET", path: "/calendar/status", allowSoftUnauthorized: true)
        return (result["connected"]?.value as? Bool) ?? false
    }

    func disconnectGoogleCalendar() async throws {
        let _: [String: AnyCodable] = try await request("POST", path: "/calendar/disconnect")
    }

    // MARK: - Documents

    func fetchDocuments() async throws -> DocumentsResponse {
        try await request("GET", path: "/documents")
    }

    func getContractPDFURL(visitId: String) -> URL? {
        URL(string: "\(baseURL)/exports/visits/\(visitId)/contract.pdf")
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
        let _: [String: String] = try await request("DELETE", path: "/notes/tasks/\(id)")
    }

    // MARK: - Billing & Subscription

    func fetchSubscription() async throws -> UserSubscription {
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

    // MARK: - Logout

    func logout() {
        token = nil
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
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .unauthorized: return "Session expired. Please log in again."
        case .serverError(let msg): return msg
        }
    }
}
