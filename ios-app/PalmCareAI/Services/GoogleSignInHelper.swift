import Foundation
import UIKit

#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

/// Thin wrapper so the app builds even before the GoogleSignIn package is linked.
enum GoogleSignInHelper {
    struct Result {
        let idToken: String
        let fullName: String?
    }

    enum SignInError: LocalizedError {
        case cancelled
        case notConfigured
        case missingToken
        case failed(String)

        var errorDescription: String? {
            switch self {
            case .cancelled: return nil
            case .notConfigured: return "Google Sign In is not configured."
            case .missingToken: return "Google Sign In failed. Try again."
            case .failed(let m): return m
            }
        }
    }

    @MainActor
    static func signIn() async throws -> Result {
        #if canImport(GoogleSignIn)
        guard let clientID = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_CLIENT_ID") as? String,
              !clientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            throw SignInError.notConfigured
        }

        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        guard let presenter = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow })?
            .rootViewController
        else {
            throw SignInError.failed("Unable to present Google Sign In.")
        }

        do {
            let gid = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = gid.user.idToken?.tokenString, !idToken.isEmpty else {
                throw SignInError.missingToken
            }
            let name = gid.user.profile?.name
            return Result(idToken: idToken, fullName: name)
        } catch let error as NSError {
            // GID error code -5 is cancel
            if error.code == -5 { throw SignInError.cancelled }
            throw SignInError.failed(error.localizedDescription)
        }
        #else
        throw SignInError.notConfigured
        #endif
    }
}
