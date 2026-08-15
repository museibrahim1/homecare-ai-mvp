import AuthenticationServices
import CommonCrypto
import Foundation
import SwiftUI
import UIKit

/// Native Sign in with Apple → returns identity token + optional full name.
@MainActor
final class AppleSignInCoordinator: NSObject, ObservableObject {
    private var continuation: CheckedContinuation<AppleSignInResult, Error>?
    private var pendingRawNonce: String = ""

    struct AppleSignInResult {
        let idToken: String
        let fullName: String?
        let nonce: String
    }

    enum AppleSignInError: LocalizedError {
        case cancelled
        case missingToken
        case failed(String)

        var errorDescription: String? {
            switch self {
            case .cancelled: return nil
            case .missingToken: return "Apple Sign In failed. Try again."
            case .failed(let m): return m
            }
        }
    }

    func signIn() async throws -> AppleSignInResult {
        let nonce = Self.randomNonce()
        pendingRawNonce = nonce
        return try await withCheckedThrowingContinuation { cont in
            self.continuation = cont
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = Self.sha256(nonce)
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var random: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            if status != errSecSuccess { break }
            if Int(random) < charset.count {
                result.append(charset[Int(random)])
                remaining -= 1
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        guard let data = input.data(using: .utf8) else { return input }
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes { buffer in
            _ = CC_SHA256(buffer.baseAddress, CC_LONG(data.count), &hash)
        }
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}

extension AppleSignInCoordinator: ASAuthorizationControllerDelegate {
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        defer { continuation = nil }
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8)
        else {
            continuation?.resume(throwing: AppleSignInError.missingToken)
            return
        }
        var name: String?
        if let full = cred.fullName {
            let parts = [full.givenName, full.familyName].compactMap { $0 }.filter { !$0.isEmpty }
            if !parts.isEmpty { name = parts.joined(separator: " ") }
        }
        continuation?.resume(returning: AppleSignInResult(
            idToken: idToken,
            fullName: name,
            nonce: pendingRawNonce
        ))
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        defer { continuation = nil }
        if let authErr = error as? ASAuthorizationError, authErr.code == .canceled {
            continuation?.resume(throwing: AppleSignInError.cancelled)
        } else {
            continuation?.resume(throwing: AppleSignInError.failed(error.localizedDescription))
        }
    }
}

extension AppleSignInCoordinator: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
