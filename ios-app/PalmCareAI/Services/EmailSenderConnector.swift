import AuthenticationServices
import Foundation
import UIKit

/// Drives the "Connect your business email" OAuth flow. Opens Google's consent
/// screen in an ASWebAuthenticationSession, captures the returned authorization
/// code (via the app's custom URL scheme), and exchanges it through the backend.
@MainActor
final class EmailSenderConnector: NSObject, ObservableObject {
    @Published var isConnecting = false

    private var session: ASWebAuthenticationSession?

    enum ConnectError: LocalizedError {
        case cancelled
        case missingCode
        case startFailed

        var errorDescription: String? {
            switch self {
            case .cancelled: return "Connection cancelled."
            case .missingCode: return "Could not read the authorization from Google."
            case .startFailed: return "Couldn't start the sign-in session."
            }
        }
    }

    func connect(api: APIService) async throws -> EmailSenderStatus {
        isConnecting = true
        defer { isConnecting = false }

        let state = UUID().uuidString
        let authURL = try await api.emailSenderAuthURL(state: state)
        let callbackURL = try await startSession(url: authURL)

        guard let code = code(from: callbackURL, expectedState: state) else {
            throw ConnectError.missingCode
        }
        return try await api.connectEmailSender(code: code)
    }

    private func startSession(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<URL, Error>) in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "com.palmcareai.app"
            ) { callbackURL, error in
                if let error = error {
                    if let asError = error as? ASWebAuthenticationSessionError,
                       asError.code == .canceledLogin {
                        cont.resume(throwing: ConnectError.cancelled)
                    } else {
                        cont.resume(throwing: error)
                    }
                } else if let callbackURL = callbackURL {
                    cont.resume(returning: callbackURL)
                } else {
                    cont.resume(throwing: ConnectError.missingCode)
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                cont.resume(throwing: ConnectError.startFailed)
            }
        }
    }

    private func code(from url: URL, expectedState: String) -> String? {
        guard let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems else {
            return nil
        }
        // CSRF guard: state must round-trip.
        if let returnedState = items.first(where: { $0.name == "state" })?.value,
           returnedState != expectedState {
            return nil
        }
        return items.first(where: { $0.name == "code" })?.value
    }
}

extension EmailSenderConnector: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        return scene?.windows.first(where: { $0.isKeyWindow }) ?? scene?.windows.first ?? ASPresentationAnchor()
    }
}
