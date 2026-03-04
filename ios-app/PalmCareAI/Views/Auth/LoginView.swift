import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject var api: APIService
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var rememberMe = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showRegister = false
    @State private var showForgotPassword = false
    

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 10) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 13)
                                    .fill(LinearGradient.palmPrimary)
                                    .frame(width: 44, height: 44)
                                    .shadow(color: Color.palmPrimary.opacity(0.35), radius: 7, y: 2)

                                Image(systemName: "mic.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.white)
                            }

                            VStack(alignment: .leading, spacing: 1) {
                                Text("PalmCare AI")
                                    .font(.system(size: 16, weight: .heavy))
                                    .foregroundColor(.palmText)
                                    .tracking(-0.3)

                                Text("Where care meets intelligence")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.palmPrimary)
                            }
                        }
                        .padding(.bottom, 20)

                        VStack(alignment: .leading, spacing: 0) {
                            Text("Welcome")
                                .font(.system(size: 30, weight: .black))
                                .foregroundColor(.palmText)
                                .tracking(-1)
                            Text("back. Let's")
                                .font(.system(size: 30, weight: .black))
                                .foregroundColor(.palmText)
                                .tracking(-1)
                            Text("Palm It.")
                                .font(.system(size: 30, weight: .black))
                                .italic()
                                .foregroundColor(.palmPrimary)
                                .tracking(-1)
                        }
                        .padding(.bottom, 8)

                        (Text("Every assessment you record, every contract you generate — it all starts here. ")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                        + Text("Your next client is waiting.")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.palmPrimaryDark))
                        .lineSpacing(3)
                    }
                    .padding(.top, 52)
                    .padding(.bottom, 20)

                    HStack(spacing: 10) {
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                        Text("Sign in to your account")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.palmSecondary)
                            .fixedSize()
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                    }
                    .padding(.bottom, 18)

                    VStack(alignment: .leading, spacing: 5) {
                        Text("Email address")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.palmTextMuted)

                        HStack(spacing: 10) {
                            Image(systemName: "envelope")
                                .font(.system(size: 15))
                                .foregroundColor(.palmSecondary)
                                .frame(width: 20)

                            TextField("you@example.com", text: $email)
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.palmFieldBg)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
                    }
                    .padding(.bottom, 14)

                    VStack(alignment: .leading, spacing: 5) {
                        Text("Password")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.palmTextMuted)

                        HStack(spacing: 10) {
                            Image(systemName: "lock")
                                .font(.system(size: 15))
                                .foregroundColor(.palmSecondary)
                                .frame(width: 20)

                            if showPassword {
                                TextField("Enter your password", text: $password)
                                    .font(.system(size: 13))
                                    .foregroundColor(.palmText)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Enter your password", text: $password)
                                    .font(.system(size: 13))
                                    .foregroundColor(.palmText)
                            }

                            Button { showPassword.toggle() } label: {
                                Image(systemName: showPassword ? "eye.slash" : "eye")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.palmFieldBg)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
                    }
                    .padding(.bottom, 18)

                    HStack {
                        Button { rememberMe.toggle() } label: {
                            HStack(spacing: 7) {
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(rememberMe ? Color.palmPrimary : Color.palmBorder, lineWidth: 1.5)
                                    .frame(width: 16, height: 16)
                                    .overlay(
                                        rememberMe ?
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.palmPrimary)
                                        : nil
                                    )

                                Text("Keep me signed in")
                                    .font(.system(size: 12))
                                    .foregroundColor(.palmSecondary)
                            }
                        }

                        Spacer()

                        Button { showForgotPassword = true } label: {
                            Text("Forgot password?")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                    .padding(.bottom, 18)

                    Button { performLogin() } label: {
                        HStack {
                            if isLoading {
                                ProgressView().tint(.white)
                            }
                            Text("Sign In ")
                                .font(.system(size: 14, weight: .heavy))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .cornerRadius(12)
                        .shadow(color: Color.palmPrimary.opacity(0.35), radius: 7, y: 3)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity((email.isEmpty || password.isEmpty) ? 0.5 : 1)
                    .padding(.bottom, 14)

                    HStack(spacing: 10) {
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                        Text("or sign in with")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.palmSecondary)
                            .fixedSize()
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                    }
                    .padding(.bottom, 14)

                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.fullName, .email]
                    } onCompletion: { result in
                        handleAppleSignIn(result)
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 44)
                    .cornerRadius(8)
                    .padding(.bottom, 8)

                    HStack(spacing: 4) {
                        Text("New to PalmCare?")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                        Button { showRegister = true } label: {
                            Text("Create your account →")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmPrimary)
                        }
                    }

                    HStack(spacing: 6) {
                        Circle().fill(Color.palmPrimaryLight).frame(width: 4, height: 4)
                        Text("PalmCare AI · Built for care professionals")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.palmPrimary)
                            .tracking(0.3)
                        Circle().fill(Color.palmPrimaryLight).frame(width: 4, height: 4)
                    }
                    .padding(.top, 20)
                    .padding(.bottom, 16)
                }
                .padding(.horizontal, 22)
            }
            .background(Color.white)
            .navigationBarBackButtonHidden(false)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView().environmentObject(api)
            }
            .alert("Login Failed", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordSheet().environmentObject(api)
            }
        }
    }

    private func performLogin() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let response = try await api.login(email: email, password: password)
                await MainActor.run {
                    if let token = response.access_token {
                        api.token = token
                    } else {
                        errorMessage = "Login succeeded but no token received."
                        showError = true
                    }
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

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else {
                errorMessage = "Could not process Apple Sign In credentials."
                showError = true
                return
            }

            let appleEmail = credential.email
            let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")

            isLoading = true
            Task {
                do {
                    var body: [String: Any] = ["id_token": idToken]
                    if let email = appleEmail { body["email"] = email }
                    if !fullName.isEmpty { body["full_name"] = fullName }
                    let response: LoginResponse = try await api.request(
                        "POST", path: "/auth/apple-signin",
                        body: body,
                        noAuth: true
                    )
                    await MainActor.run {
                        if let token = response.access_token {
                            api.token = token
                        }
                        isLoading = false
                    }
                } catch {
                    await MainActor.run {
                        errorMessage = "Apple Sign In is not yet configured on the server. Please use email/password."
                        showError = true
                        isLoading = false
                    }
                }
            }

        case .failure(let error):
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.palmPrimary.opacity(0.1))
                                .frame(width: 64, height: 64)
                            Image(systemName: "envelope.badge.shield.half.filled")
                                .font(.system(size: 26))
                                .foregroundColor(.palmPrimary)
                        }

                        Text("Reset Password")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.palmText)

                        Text("Enter your email and we'll send you a link to reset your password.")
                            .font(.system(size: 13))
                            .foregroundColor(.palmSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 8)

                    if sent {
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.palmGreen)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Email Sent!")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.palmGreen)
                                Text("Check your inbox for a password reset link.")
                                    .font(.system(size: 12))
                                    .foregroundColor(.palmSecondary)
                            }
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.palmGreen.opacity(0.08))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmGreen.opacity(0.2), lineWidth: 1))
                    } else {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Email address")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "envelope")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)

                                TextField("you@example.com", text: $email)
                                    .font(.system(size: 13))
                                    .foregroundColor(.palmText)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg)
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        }

                        if let error = errorMessage {
                            Text(error)
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                        }

                        Button { sendReset() } label: {
                            HStack {
                                if isLoading { ProgressView().tint(.white).scaleEffect(0.8) }
                                Text("Send Reset Link")
                                    .font(.system(size: 15, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                email.isEmpty
                                    ? Color.palmSecondary.opacity(0.3)
                                    : Color.palmPrimary
                            )
                            .cornerRadius(12)
                        }
                        .disabled(email.isEmpty || isLoading)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Forgot Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(sent ? "Done" : "Cancel") { dismiss() }
                }
            }
        }
    }

    private func sendReset() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await api.forgotPassword(email: email)
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
    LoginView()
        .environmentObject(APIService.shared)
}
