import SwiftUI

/// Simple, fast registration: full name + email + password.
///
/// We deliberately ask for as little as possible up front. Everything else
/// (agency address, phone, state, etc.) can be filled in later from Settings.
/// Backend auto-approves the account and returns an access token, so the
/// user is signed in the moment they tap "Create Account".
struct RegisterView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agencyName = ""

    @State private var showPassword = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showMagicLinkSent = false
    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case fullName, email, password, agencyName
    }

    private var passwordIsStrong: Bool { password.count >= 8 }

    private var isEmailValid: Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.contains("@") && trimmed.contains(".") && trimmed.count > 5
    }

    private var formIsValid: Bool {
        !fullName.trimmingCharacters(in: .whitespaces).isEmpty
            && isEmailValid
            && passwordIsStrong
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                    .padding(.top, 8)
                    .padding(.bottom, 28)

                VStack(spacing: 14) {
                    nameField
                    emailField
                    passwordField
                    agencyField

                    createButton
                        .padding(.top, 8)

                    bottomLink
                        .padding(.top, 8)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(UIColor.systemBackground))
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
        .palmBackButton()
        .palmErrorAlert("Registration Failed", message: $errorMessage, isPresented: $showError)
        .alert("Check your email", isPresented: $showMagicLinkSent) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("If an account exists for that email, we just sent a one-tap sign-in link.")
        }
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: 14) {
            PalmOrbLogo(size: 72, animated: true)
            VStack(spacing: 4) {
                Text("Get started in 30 seconds")
                    .font(.system(size: 22, weight: .bold))
                Text("Built for licensed home care agencies.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 24)
    }

    private var nameField: some View {
        roundedField(
            icon: "person",
            placeholder: "Your full name",
            text: $fullName,
            keyboard: .default,
            contentType: .name,
            focus: .fullName,
            next: .email
        )
    }

    private var emailField: some View {
        roundedField(
            icon: "envelope",
            placeholder: "Email",
            text: $email,
            keyboard: .emailAddress,
            contentType: .emailAddress,
            focus: .email,
            next: .password
        )
    }

    private var passwordField: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 12) {
                Image(systemName: "lock")
                    .font(.system(size: 17))
                    .foregroundColor(.secondary)
                    .frame(width: 22)

                Group {
                    if showPassword {
                        TextField("Password (at least 8 characters)", text: $password)
                            .textContentType(.newPassword)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField("Password (at least 8 characters)", text: $password)
                            .textContentType(.newPassword)
                    }
                }
                .font(.body)
                .focused($focusedField, equals: .password)
                .submitLabel(.next)
                .onSubmit { focusedField = .agencyName }

                Button { showPassword.toggle() } label: {
                    Image(systemName: showPassword ? "eye.slash" : "eye")
                        .font(.system(size: 17))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color(UIColor.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(focusedField == .password ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
            )

            if !password.isEmpty && !passwordIsStrong {
                Label("At least 8 characters", systemImage: "info.circle")
                    .font(.footnote)
                    .foregroundColor(.orange)
            }
        }
    }

    private var agencyField: some View {
        roundedField(
            icon: "building.2",
            placeholder: "Agency name (optional)",
            text: $agencyName,
            keyboard: .default,
            contentType: .organizationName,
            focus: .agencyName,
            next: nil
        )
    }

    private var createButton: some View {
        Button(action: performRegister) {
            ZStack {
                Text("Create Account")
                    .font(.headline)
                    .foregroundColor(.white)
                    .opacity(isLoading ? 0 : 1)
                if isLoading {
                    ProgressView().tint(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(formIsValid ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
            )
        }
        .disabled(!formIsValid || isLoading)
        .accessibilityIdentifier("createAccountButton")
    }

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Color.secondary.opacity(0.2)).frame(height: 1)
            Text("OR").font(.caption).foregroundColor(.secondary)
            Rectangle().fill(Color.secondary.opacity(0.2)).frame(height: 1)
        }
    }

    private var magicLinkButton: some View {
        Button(action: sendMagicLink) {
            HStack {
                Image(systemName: "envelope.badge")
                Text("Email me a sign-in link instead")
            }
            .font(.subheadline.weight(.medium))
            .foregroundColor(.palmPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.palmPrimary.opacity(0.4), lineWidth: 1)
            )
        }
        .disabled(!isEmailValid || isLoading)
        .opacity(isEmailValid ? 1 : 0.6)
    }

    private var bottomLink: some View {
        VStack(spacing: 14) {
            HStack(spacing: 4) {
                Text("Already have an account?")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Button { dismiss() } label: {
                    Text("Sign in")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmPrimary)
                }
            }
            VStack(spacing: 4) {
                Text("By creating an account, you agree to our")
                    .font(.caption)
                    .foregroundColor(.secondary)
                HStack(spacing: 4) {
                    Link("Terms of Service", destination: URL(string: "https://palmcareai.com/legal/terms")!)
                        .font(.caption.weight(.semibold))
                    Text("and")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Link("Privacy Policy", destination: URL(string: "https://palmcareai.com/legal/privacy")!)
                        .font(.caption.weight(.semibold))
                }
            }
            .multilineTextAlignment(.center)
            .padding(.horizontal, 8)
        }
    }

    // MARK: - Helpers

    private func roundedField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType,
        contentType: UITextContentType?,
        focus: Field,
        next: Field?
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 17))
                .foregroundColor(.secondary)
                .frame(width: 22)
            TextField(placeholder, text: text)
                .font(.body)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
                .submitLabel(next == nil ? .done : .next)
                .focused($focusedField, equals: focus)
                .onSubmit { focusedField = next }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focusedField == focus ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
    }

    private func performRegister() {
        focusedField = nil
        isLoading = true
        errorMessage = nil

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let trimmedFullName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedAgency = agencyName.trimmingCharacters(in: .whitespacesAndNewlines)

        // Minimal payload — backend fills in defaults for everything optional.
        var body: [String: Any] = [
            "owner_email": trimmedEmail,
            "owner_password": password,
            "owner_name": trimmedFullName,
        ]
        if !trimmedAgency.isEmpty {
            body["name"] = trimmedAgency
        }

        Task {
            do {
                try await api.register(body: body)
                // register() now sets api.token automatically on success.
                await MainActor.run {
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showError = true
                    isLoading = false
                }
            }
        }
    }

    private func sendMagicLink() {
        focusedField = nil
        isLoading = true
        errorMessage = nil

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        Task {
            do {
                try await api.requestMagicLink(email: trimmedEmail)
                await MainActor.run {
                    isLoading = false
                    showMagicLinkSent = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showError = true
                    isLoading = false
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(APIService.shared)
    }
}
