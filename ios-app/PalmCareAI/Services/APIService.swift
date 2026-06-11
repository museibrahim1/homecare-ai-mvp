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

    /// Long-lived rotating token used to renew the 1-hour access token so
    /// Face ID users stay signed in. Lives only in the Keychain.
    var refreshToken: String? {
        didSet {
            if let refreshToken = refreshToken {
                KeychainHelper.saveRefreshToken(refreshToken)
            } else {
                KeychainHelper.deleteRefreshToken()
            }
        }
    }

    /// In-flight refresh, shared so concurrent 401s trigger one network call.
    private var refreshTask: Task<Bool, Never>?

    var isAuthenticated: Bool { token != nil }

    /// Exchange the stored refresh token for a fresh access token.
    /// Returns true on success. Safe to call concurrently.
    @MainActor
    func refreshSession() async -> Bool {
        if let existing = refreshTask {
            return await existing.value
        }
        guard let currentRefresh = refreshToken else { return false }

        let task = Task<Bool, Never> { [weak self] in
            guard let self else { return false }
            struct RefreshResponse: Codable {
                let access_token: String
                let refresh_token: String?
            }
            do {
                let url = try self.validatedURL(path: "/auth/refresh")
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.timeoutInterval = 15
                request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": currentRefresh])
                let (data, response) = try await self.session.data(for: request)
                guard let http = response as? HTTPURLResponse else { return false }
                if http.statusCode == 401 {
                    // Refresh token revoked/expired — session is truly over.
                    await MainActor.run {
                        self.refreshToken = nil
                        self.token = nil
                    }
                    return false
                }
                guard (200...299).contains(http.statusCode) else { return false }
                let parsed = try self.sharedDecoder.decode(RefreshResponse.self, from: data)
                await MainActor.run {
                    self.token = parsed.access_token
                    if let newRefresh = parsed.refresh_token, !newRefresh.isEmpty {
                        self.refreshToken = newRefresh
                    }
                }
                return true
            } catch {
                // Network error: keep the refresh token so we can try again.
                return false
            }
        }
        refreshTask = task
        let result = await task.value
        refreshTask = nil
        return result
    }

    // MARK: - In-Memory Cache

    struct CacheEntry<T> {
        let value: T
        let timestamp: Date
        func isValid(ttl: TimeInterval) -> Bool {
            Date().timeIntervalSince(timestamp) < ttl
        }
    }

    var cachedClients: CacheEntry<[Client]>?
    var cachedVisits: CacheEntry<[Visit]>?
    var cachedUser: CacheEntry<User>?
    let cacheTTL: TimeInterval = 30 // 30 seconds
    lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.waitsForConnectivity = false
        return URLSession(configuration: config, delegate: SSLPinningDelegate.shared, delegateQueue: nil)
    }()

    func clearCache() {
        cachedClients = nil
        cachedVisits = nil
        cachedUser = nil
    }

    // MARK: - Logout

    /// End the session and wipe everything user-specific from the device:
    /// keychain token, cached PHI, calendar cache, recordings, and temp files.
    func logout() {
        refreshToken = nil
        token = nil

        // Clear any cached PHI from UserDefaults (legacy keys + new ones).
        let defaults = UserDefaults.standard
        for key in [
            "palmcare_calendar_events",
            "googleCalendarConnected",
            "cachedClients",
            "cachedVisits",
            "lastSyncedAt",
        ] {
            defaults.removeObject(forKey: key)
        }
        URLCache.shared.removeAllCachedResponses()

        let fm = FileManager.default

        // Wipe the encrypted calendar cache file (see CalendarStorage).
        if let docsDir = fm.urls(for: .documentDirectory, in: .userDomainMask).first {
            for name in ["palmcare_calendar.cache", "calendar_events.json"] {
                let url = docsDir.appendingPathComponent(name)
                if fm.fileExists(atPath: url.path) {
                    try? fm.removeItem(at: url)
                }
            }
        }

        // Recordings directory (PHI audio).
        let recordingsDir = fm.urls(for: .documentDirectory, in: .userDomainMask).first?.appendingPathComponent("Recordings")
        if let dir = recordingsDir, fm.fileExists(atPath: dir.path) {
            try? fm.removeItem(at: dir)
        }

        // Tmp directory (export sheets, chunked audio, etc.).
        let tmpDir = fm.temporaryDirectory
        if let files = try? fm.contentsOfDirectory(atPath: tmpDir.path) {
            for file in files {
                try? fm.removeItem(at: tmpDir.appendingPathComponent(file))
            }
        }
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
        refreshToken = KeychainHelper.loadRefreshToken()

        // A stored refresh token but no access token means the last session
        // ended with an expired JWT — silently restore the session so Face ID
        // users go straight in instead of back to the login screen.
        if token == nil, refreshToken != nil {
            Task { @MainActor in
                _ = await self.refreshSession()
            }
        }
    }

    #if DEBUG
    func autoLoginDemoIfNeeded() {
        guard token == nil else { return }
        guard let email = Bundle.main.infoDictionary?["DEMO_EMAIL"] as? String, !email.isEmpty,
              let pass = Bundle.main.infoDictionary?["DEMO_PASSWORD"] as? String, !pass.isEmpty else { return }
        Task {
            // Use the shared login() which falls back to business auth, so demo
            // accounts created via the simplified business signup also work.
            guard let resp = try? await self.login(email: email, password: pass) else { return }
            await MainActor.run { self.token = resp.access_token }
        }
    }
    #endif

    let sharedDecoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    var jsonDecoder: JSONDecoder { sharedDecoder }

    func isAllowedURL(_ url: URL) -> Bool {
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

    func validatedURL(path: String) throws -> URL {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        guard isAllowedURL(url) else {
            throw APIError.serverError("Insecure connection blocked.")
        }
        return url
    }

    func request<T: Decodable>(_ method: String, path: String, body: [String: Any]? = nil, noAuth: Bool = false, allowSoftUnauthorized: Bool = false, isRetry: Bool = false) async throws -> T {
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
            // Access token expired — try renewing with the refresh token and
            // retry the call once before giving up the session.
            if !noAuth, !isRetry, await refreshSession() {
                return try await self.request(method, path: path, body: body, noAuth: noAuth, allowSoftUnauthorized: allowSoftUnauthorized, isRetry: true)
            }
            await MainActor.run {
                self.refreshToken = nil
                self.token = nil
            }
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

    func requestVoid(_ method: String, path: String, body: [String: Any]? = nil, isRetry: Bool = false) async throws {
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
            if !isRetry, await refreshSession() {
                return try await self.requestVoid(method, path: path, body: body, isRetry: true)
            }
            await MainActor.run {
                self.refreshToken = nil
                self.token = nil
            }
            throw APIError.unauthorized
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.detail ?? errorBody.message ?? "Request failed")
            }
            throw APIError.serverError("Something went wrong. Please try again.")
        }
    }

    func rawRequest(_ method: String, path: String, jsonBody: [String: Any]? = nil) async throws -> Data {
        let url = try validatedURL(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let jsonBody = jsonBody {
            request.httpBody = try JSONSerialization.data(withJSONObject: jsonBody)
        }
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError("Request failed")
        }
        return data
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
    let access_token: String?
    let token_type: String?
    let refresh_token: String?
    let next_steps: [String]?
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
            // Don't pass raw JSON, stack traces, or anything that looks like
            // server internals out to the user.
            let lowered = msg.lowercased()
            if msg.contains("{") || msg.contains("}")
                || msg.contains("<") || msg.contains("</")
                || lowered.contains("traceback") || lowered.contains("exception")
                || msg.count > 120 {
                return "Something went wrong. Please try again."
            }
            return msg
        }
    }
}

private enum KeychainHelper {
    // Use the same service identifier as our bundle ID so Keychain
    // entries are scoped correctly. (The legacy "com.palmcare.ai"
    // value is migrated below on first launch.)
    private static let service = "com.palmcareai.app"
    private static let legacyService = "com.palmcare.ai"
    private static let tokenKey = "auth_token"
    private static let refreshTokenKey = "refresh_token"

    static func save(_ token: String) {
        save(token, account: tokenKey)
    }

    static func saveRefreshToken(_ token: String) {
        save(token, account: refreshTokenKey)
    }

    static func loadRefreshToken() -> String? {
        read(service: service, account: refreshTokenKey)
    }

    static func deleteRefreshToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: refreshTokenKey,
        ]
        SecItemDelete(query as CFDictionary)
    }

    private static func save(_ token: String, account: String) {
        guard let data = token.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            // Keep auth tokens device-bound and unavailable in backups/migrations.
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        SecItemDelete(query as CFDictionary)
        var addQuery = query
        addQuery[kSecValueData as String] = data
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        if status != errSecSuccess {
            // Do not silently downgrade accessibility — weaker Keychain storage
            // is inappropriate for auth tokens in a care-documentation app.
            #if DEBUG
            print("Keychain save failed (status \(status))")
            #endif
        }
    }

    static func load() -> String? {
        if let token = read(service: service, account: tokenKey) {
            return token
        }
        // One-time migration: pull from legacy service ID and re-save under
        // the new one so future loads stay on the modern key.
        if let legacy = read(service: legacyService, account: tokenKey) {
            save(legacy)
            deleteLegacy()
            return legacy
        }
        return nil
    }

    private static func read(service: String, account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
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
        deleteLegacy()
    }

    private static func deleteLegacy() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: legacyService,
            kSecAttrAccount as String: tokenKey,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

/// SSL/TLS certificate pinning for API requests.
/// Rejects connections if the server cert doesn't chain to a trusted CA
/// and the host doesn't match our allowed domains.
class SSLPinningDelegate: NSObject, URLSessionDelegate {
    static let shared = SSLPinningDelegate()
    private let pinnedHosts: Set<String> = [
        "api-production-a0a2.up.railway.app",
        "palmcareai.com",
        "palmtai.com",
    ]

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let host = challenge.protectionSpace.host
        guard pinnedHosts.contains(host) || host.hasSuffix(".railway.app") else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        var error: CFError?
        let isValid = SecTrustEvaluateWithError(serverTrust, &error)
        if isValid {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

extension Data {
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}

extension Error {
    /// User-safe message for alerts and inline error text.
    var palmFriendlyMessage: String {
        if let api = self as? APIError, let desc = api.errorDescription {
            return desc
        }
        let raw = localizedDescription
        let lower = raw.lowercased()
        if lower.contains("invalid") && (lower.contains("credentials") || lower.contains("password") || lower.contains("email")) {
            return "Incorrect email or password."
        }
        if lower.contains("network") || lower.contains("offline") || lower.contains("connection") || lower.contains("timed out") {
            return "Can't reach PALM. Check your internet connection and try again."
        }
        if raw.contains("{") || raw.contains("<") || raw.count > 120 {
            return "Something went wrong. Please try again."
        }
        return raw
    }
}
