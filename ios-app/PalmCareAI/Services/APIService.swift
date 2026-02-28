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
    
    // Generic request method
    func request<T: Decodable>(_ method: String, path: String, body: [String: Any]? = nil, noAuth: Bool = false) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
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
            await MainActor.run { self.token = nil }
            throw APIError.unauthorized
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.detail ?? "Request failed")
            }
            throw APIError.serverError("Request failed (\(httpResponse.statusCode))")
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    // Login
    func login(email: String, password: String) async throws -> LoginResponse {
        try await request("POST", path: "/auth/login", body: ["email": email, "password": password], noAuth: true)
    }
    
    // Get current user
    func fetchUser() async throws -> User {
        try await request("GET", path: "/auth/me")
    }
    
    // Register business
    func register(body: [String: Any]) async throws {
        let _: RegisterResponse = try await request("POST", path: "/auth/business/register", body: body, noAuth: true)
    }
    
    // Clients
    func fetchClients() async throws -> [Client] {
        let wrapper: ClientsWrapper = try await request("GET", path: "/clients")
        return wrapper.items ?? wrapper.clients ?? []
    }
    
    // Visits  
    func fetchVisits() async throws -> [Visit] {
        let wrapper: VisitsWrapper = try await request("GET", path: "/visits")
        return wrapper.items ?? wrapper.visits ?? []
    }
    
    // Upload audio
    func uploadAudio(clientId: String, audioData: Data, filename: String) async throws -> Visit {
        guard let url = URL(string: "\(baseURL)/visits/upload") else {
            throw APIError.invalidURL
        }
        
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        var body = Data()
        // client_id field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"client_id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(clientId)\r\n".data(using: .utf8)!)
        // audio file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError("Upload failed")
        }
        return try JSONDecoder().decode(Visit.self, from: data)
    }
    
    func logout() {
        token = nil
    }
}

struct ErrorResponse: Codable {
    let detail: String?
}

struct RegisterResponse: Codable {
    let business_id: String?
    let message: String?
}

struct ClientsWrapper: Codable {
    let items: [Client]?
    let clients: [Client]?
}

struct VisitsWrapper: Codable {
    let items: [Visit]?
    let visits: [Visit]?
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response"
        case .unauthorized: return "Session expired"
        case .serverError(let msg): return msg
        }
    }
}
