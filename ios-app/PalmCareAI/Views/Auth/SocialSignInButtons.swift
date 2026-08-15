import SwiftUI
import AuthenticationServices

/// Apple + Google buttons for Login and Register.
struct SocialSignInButtons: View {
    @EnvironmentObject var api: APIService

    @StateObject private var apple = AppleSignInCoordinator()
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showMFA = false
    @State private var pendingMfaToken: String = ""

    var body: some View {
        VStack(spacing: 12) {
            Button { Task { await runApple() } } label: {
                HStack(spacing: 10) {
                    Image(systemName: "apple.logo")
                        .font(.system(size: 18, weight: .semibold))
                    Text(isLoading ? "Signing in…" : "Continue with Apple")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Color.black)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(isLoading)
            .accessibilityLabel("Continue with Apple")

            Button { Task { await runGoogle() } } label: {
                HStack(spacing: 10) {
                    Image(systemName: "g.circle.fill")
                        .font(.system(size: 20))
                    Text("Continue with Google")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.primary)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Color(UIColor.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.primary.opacity(0.12), lineWidth: 1)
                )
            }
            .disabled(isLoading)
            .accessibilityLabel("Continue with Google")

            HStack {
                Rectangle().fill(Color.secondary.opacity(0.25)).frame(height: 1)
                Text("or use email")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Rectangle().fill(Color.secondary.opacity(0.25)).frame(height: 1)
            }
            .padding(.top, 4)
        }
        .palmErrorAlert("Sign In Failed", message: $errorMessage, isPresented: $showError)
        .sheet(isPresented: $showMFA) {
            SocialMFASheet(mfaToken: pendingMfaToken)
                .environmentObject(api)
                .presentationDetents([.medium])
        }
    }

    private func handle(_ response: SocialLoginResponse) {
        if response.requires_mfa == true, let token = response.mfa_token, !token.isEmpty {
            pendingMfaToken = token
            showMFA = true
            return
        }
    }

    private func runApple() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let result = try await apple.signIn()
            let response = try await api.socialLogin(
                provider: "apple",
                idToken: result.idToken,
                fullName: result.fullName,
                nonce: result.nonce
            )
            handle(response)
        } catch let err as AppleSignInCoordinator.AppleSignInError {
            if case .cancelled = err { return }
            errorMessage = err.errorDescription ?? "Sign-in failed. Try again."
            showError = true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            showError = true
        }
    }

    private func runGoogle() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let result = try await GoogleSignInHelper.signIn()
            let response = try await api.socialLogin(
                provider: "google",
                idToken: result.idToken,
                fullName: result.fullName,
                nonce: nil
            )
            handle(response)
        } catch let err as GoogleSignInHelper.SignInError {
            if case .cancelled = err { return }
            if case .notConfigured = err {
                errorMessage = "Google Sign In is not configured yet. Use Apple or email."
            } else {
                errorMessage = err.errorDescription ?? "Sign-in failed. Try again."
            }
            showError = true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            showError = true
        }
    }
}

struct SocialMFASheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss
    let mfaToken: String

    @State private var code = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Enter the 6-digit code from your authenticator app.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)

                TextField("000000", text: $code)
                    .keyboardType(.numberPad)
                    .font(.system(size: 28, weight: .semibold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .focused($focused)
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                Button {
                    Task { await submit() }
                } label: {
                    Text(isLoading ? "Verifying…" : "Verify")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(Color.palmPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(code.count < 6 || isLoading)

                Spacer()
            }
            .padding(24)
            .navigationTitle("Two-factor code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear { focused = true }
        }
    }

    private func submit() async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await api.mfaVerify(mfaToken: mfaToken, code: code)
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
