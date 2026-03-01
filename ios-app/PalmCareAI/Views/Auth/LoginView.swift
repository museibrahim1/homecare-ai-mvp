import SwiftUI

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

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Brand moment
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

                        // Slogan
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

                    // Divider
                    HStack(spacing: 10) {
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                        Text("Sign in to your account")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.palmSecondary)
                            .fixedSize()
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                    }
                    .padding(.bottom, 18)

                    // Email field
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

                    // Password field
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
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Enter your password", text: $password)
                                    .font(.system(size: 13))
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

                    // Remember + Forgot
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

                        Button {} label: {
                            Text("Forgot password?")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                    .padding(.bottom, 18)

                    // Sign In button
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

                    // Or divider
                    HStack(spacing: 10) {
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                        Text("or sign in with")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.palmSecondary)
                            .fixedSize()
                        Rectangle().fill(Color.palmBorder).frame(height: 1)
                    }
                    .padding(.bottom, 14)

                    // Social buttons
                    SocialLoginButton(icon: "g.circle.fill", text: "Continue with Google")
                        .padding(.bottom, 8)
                    SocialLoginButton(icon: "apple.logo", text: "Continue with Apple")
                        .padding(.bottom, 12)

                    // Sign up link
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

                    // Brand strip
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
}

struct SocialLoginButton: View {
    let icon: String
    let text: String

    var body: some View {
        Button {} label: {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(.palmText)
                    .frame(width: 20)

                Text(text)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmTextMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(Color.white)
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(APIService.shared)
}
