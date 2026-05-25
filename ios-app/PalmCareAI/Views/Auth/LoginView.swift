import SwiftUI

struct LoginView: View {
    @EnvironmentObject var api: APIService
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showRegister = false
    @State private var showForgotPassword = false
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case email, password }

    private var canSubmit: Bool {
        !email.isEmpty && !password.isEmpty && !isLoading
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                    .padding(.top, 32)
                    .padding(.bottom, 40)

                form
                    .padding(.horizontal, 24)

                signInButton
                    .padding(.horizontal, 24)
                    .padding(.top, 24)

                magicLinkRow
                    .padding(.horizontal, 24)
                    .padding(.top, 12)

                registerPrompt
                    .padding(.top, 24)
                    .padding(.bottom, 32)
            }
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(UIColor.systemBackground))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showRegister) {
            RegisterView().environmentObject(api)
        }
        .palmErrorAlert("Sign In Failed", message: $errorMessage, isPresented: $showError)
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordSheet().environmentObject(api)
        }
        .onSubmit(submitFromKeyboard)
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: 20) {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(LinearGradient.palmPrimary)
                    .frame(width: 72, height: 72)
                    .shadow(color: Color.palmPrimary.opacity(0.3), radius: 10, y: 4)

                Image(systemName: "waveform")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundColor(.white)
            }

            VStack(spacing: 6) {
                Text("Welcome back")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.primary)

                Text("Sign in to continue to PalmCare AI")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var form: some View {
        VStack(spacing: 14) {
            iosField(
                icon: "envelope",
                placeholder: "Email",
                text: $email,
                isSecure: false,
                contentType: .username,
                keyboard: .emailAddress,
                submitLabel: .next,
                focus: .email
            )

            iosPasswordField

            HStack {
                Spacer()
                Button { showForgotPassword = true } label: {
                    Text("Forgot password?")
                        .font(.subheadline)
                        .foregroundColor(.palmPrimary)
                }
                .accessibilityIdentifier("forgotPasswordButton")
            }
            .padding(.top, 2)
        }
    }

    private var iosPasswordField: some View {
        HStack(spacing: 12) {
            Image(systemName: "lock")
                .font(.system(size: 17))
                .foregroundColor(.secondary)
                .frame(width: 22)

            Group {
                if showPassword {
                    TextField("Password", text: $password)
                        .textContentType(.password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } else {
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                }
            }
            .font(.body)
            .submitLabel(.go)
            .focused($focusedField, equals: .password)

            Button { showPassword.toggle() } label: {
                Image(systemName: showPassword ? "eye.slash" : "eye")
                    .font(.system(size: 17))
                    .foregroundColor(.secondary)
            }
            .accessibilityLabel(showPassword ? "Hide password" : "Show password")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focusedField == .password ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
    }

    private func iosField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        isSecure: Bool,
        contentType: UITextContentType?,
        keyboard: UIKeyboardType,
        submitLabel: SubmitLabel,
        focus: Field
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
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
                .autocorrectionDisabled(keyboard == .emailAddress)
                .submitLabel(submitLabel)
                .focused($focusedField, equals: focus)
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

    private var signInButton: some View {
        Button(action: performLogin) {
            ZStack {
                Text("Sign In")
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
                    .fill(canSubmit ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
            )
        }
        .disabled(!canSubmit)
        .accessibilityIdentifier("signInButton")
    }

    private var magicLinkRow: some View {
        Button(action: sendMagicLink) {
            HStack {
                Image(systemName: "envelope.badge")
                Text("Email me a sign-in link")
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
        .disabled(email.isEmpty || isLoading)
        .opacity(email.isEmpty ? 0.6 : 1)
    }

    private var registerPrompt: some View {
        HStack(spacing: 4) {
            Text("New to PalmCare AI?")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button { showRegister = true } label: {
                Text("Create an account")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.palmPrimary)
            }
            .accessibilityIdentifier("createAccountButton")
        }
    }

    // MARK: - Actions

    private func submitFromKeyboard() {
        switch focusedField {
        case .email:
            focusedField = .password
        case .password:
            if canSubmit { performLogin() }
        case .none:
            break
        }
    }

    private func performLogin() {
        focusedField = nil
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let response = try await api.login(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
                await MainActor.run {
                    if let token = response.access_token {
                        api.token = token
                    } else {
                        errorMessage = "Sign in succeeded but no token was returned. Please try again."
                        showError = true
                    }
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = friendlyError(error)
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
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        Task {
            do {
                try await api.requestMagicLink(email: trimmed)
                await MainActor.run {
                    isLoading = false
                    errorMessage = "We just sent a sign-in link to \(trimmed). Check your email."
                    showError = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = friendlyError(error)
                    showError = true
                }
            }
        }
    }

    private func friendlyError(_ error: Error) -> String {
        let raw = error.localizedDescription
        let lower = raw.lowercased()
        if lower.contains("invalid") && (lower.contains("credentials") || lower.contains("password") || lower.contains("email")) {
            return "Incorrect email or password."
        }
        if lower.contains("network") || lower.contains("offline") || lower.contains("connection") {
            return "Can't reach PalmCare AI. Check your internet connection and try again."
        }
        return raw
    }
}

// MARK: - Forgot Password Sheet

struct ForgotPasswordSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var sent = false
    @State private var errorMessage: String?
    @FocusState private var emailFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Color.palmPrimary.opacity(0.12))
                                .frame(width: 72, height: 72)
                            Image(systemName: "envelope.badge")
                                .font(.system(size: 30))
                                .foregroundColor(.palmPrimary)
                        }

                        Text(sent ? "Check your email" : "Reset your password")
                            .font(.title2.weight(.bold))

                        Text(sent
                             ? "We sent a password reset link to \(email)."
                             : "Enter the email tied to your account and we'll send you a reset link.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 8)
                    }
                    .padding(.top, 8)

                    if !sent {
                        VStack(spacing: 14) {
                            HStack(spacing: 12) {
                                Image(systemName: "envelope")
                                    .font(.system(size: 17))
                                    .foregroundColor(.secondary)
                                    .frame(width: 22)

                                TextField("Email", text: $email)
                                    .font(.body)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .focused($emailFocused)
                                    .submitLabel(.send)
                                    .onSubmit { if !email.isEmpty { sendReset() } }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .background(Color(UIColor.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                            if let error = errorMessage {
                                Text(error)
                                    .font(.footnote)
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            Button(action: sendReset) {
                                ZStack {
                                    Text("Send Reset Link")
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
                                        .fill(email.isEmpty ? Color.palmPrimary.opacity(0.4) : Color.palmPrimary)
                                )
                            }
                            .disabled(email.isEmpty || isLoading)
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
            }
            .background(Color(UIColor.systemBackground))
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(sent ? "Done" : "Cancel") { dismiss() }
                }
            }
            .onAppear { emailFocused = true }
        }
    }

    private func sendReset() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await api.forgotPassword(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
                await MainActor.run {
                    isLoading = false
                    withAnimation { sent = true }
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environmentObject(APIService.shared)
    }
}
