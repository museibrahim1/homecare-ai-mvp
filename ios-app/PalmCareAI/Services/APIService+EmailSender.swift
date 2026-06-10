import Foundation

/// Status of the user's "send from my business email" connection.
struct EmailSenderStatus: Decodable {
    let connected: Bool
    let address: String?
    let provider: String?
}

private struct AuthURLResponse: Decodable {
    let auth_url: String
}

extension APIService {
    /// The HTTPS redirect that Google returns to, which bounces back into the
    /// app via the custom URL scheme. Must be registered in Google Cloud
    /// Console as an authorized redirect URI.
    static let emailSenderRedirectURI = "https://palmcareai.com/oauth/google-email"

    func emailSenderStatus() async throws -> EmailSenderStatus {
        try await request("GET", path: "/email-sender/status", allowSoftUnauthorized: true)
    }

    func emailSenderAuthURL(state: String) async throws -> URL {
        let redirect = Self.emailSenderRedirectURI
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? Self.emailSenderRedirectURI
        let encodedState = state.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? state
        let resp: AuthURLResponse = try await request(
            "GET", path: "/email-sender/auth-url?redirect_uri=\(redirect)&state=\(encodedState)"
        )
        guard let url = URL(string: resp.auth_url) else { throw APIError.invalidURL }
        return url
    }

    @discardableResult
    func connectEmailSender(code: String) async throws -> EmailSenderStatus {
        try await request(
            "POST",
            path: "/email-sender/connect",
            body: ["code": code, "redirect_uri": Self.emailSenderRedirectURI]
        )
    }

    func disconnectEmailSender() async throws {
        try await requestVoid("POST", path: "/email-sender/disconnect")
    }
}
