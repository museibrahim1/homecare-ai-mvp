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
            ScrollView {
                VStack(spacing: 28) {
                    Spacer().frame(height: 40)

                    // Logo (matches web)
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.palmPrimary)
                            .frame(width: 48, height: 48)
                        Image(systemName: "hand.raised.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.white)
                    }
                    .padding(.bottom, 4)

                    // Title (matches web copy)
                    VStack(spacing: 8) {
                        Text("Welcome back")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.palmText)

                        Text("Sign in to generate contracts from care assessments")
                            .font(.subheadline)
                            .foregroundColor(.palmSecondary)
                            .multilineTextAlignment(.center)
                    }

                    // Form fields
                    VStack(spacing: 16) {
                        // Email
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.palmText)

                            HStack(spacing: 12) {
                                Image(systemName: "envelope")
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)

                                TextField("Enter your email", text: $email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(Color.palmFieldBg)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.palmBorder, lineWidth: 1)
                            )
                        }

                        // Password
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.palmText)

                            HStack(spacing: 12) {
                                Image(systemName: "lock")
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)

                                if showPassword {
                                    TextField("Enter your password", text: $password)
                                        .autocapitalization(.none)
                                        .disableAutocorrection(true)
                                } else {
                                    SecureField("Enter your password", text: $password)
                                }

                                Button {
                                    showPassword.toggle()
                                } label: {
                                    Image(systemName: showPassword ? "eye.slash" : "eye")
                                        .foregroundColor(.palmSecondary)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(Color.palmFieldBg)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.palmBorder, lineWidth: 1)
                            )
                        }
                    }

                    // Remember me + Forgot password
                    HStack {
                        Button {
                            rememberMe.toggle()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: rememberMe ? "checkmark.square.fill" : "square")
                                    .foregroundColor(rememberMe ? .palmPrimary : .palmSecondary)
                                    .font(.system(size: 20))

                                Text("Remember me")
                                    .font(.subheadline)
                                    .foregroundColor(.palmText)
                            }
                        }

                        Spacer()

                        Button {
                            // Forgot password action
                        } label: {
                            Text("Forgot Password?")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.palmPrimary)
                        }
                    }

                    // Log In button
                    Button {
                        performLogin()
                    } label: {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text("Sign in")
                                .font(.body.weight(.semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(LinearGradient.palmPrimary)
                        .cornerRadius(12)
                        .shadow(color: Color.palmPrimary.opacity(0.3), radius: 8, y: 2)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1)

                    // Or divider
                    HStack {
                        Rectangle()
                            .fill(Color.palmBorder)
                            .frame(height: 1)
                        Text("Or")
                            .font(.subheadline)
                            .foregroundColor(.palmSecondary)
                            .padding(.horizontal, 16)
                        Rectangle()
                            .fill(Color.palmBorder)
                            .frame(height: 1)
                    }

                    // Social buttons
                    VStack(spacing: 12) {
                        SocialLoginButton(
                            icon: "g.circle.fill",
                            text: "Continue with Google"
                        )

                        SocialLoginButton(
                            icon: "apple.logo",
                            text: "Continue with Apple"
                        )
                    }

                    // Sign up link
                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .font(.subheadline)
                            .foregroundColor(.palmSecondary)

                        Button {
                            showRegister = true
                        } label: {
                            Text("Sign Up")
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                    .padding(.top, 4)

                    Spacer().frame(height: 20)
                }
                .padding(.horizontal, 24)
            }
            .background(Color.white)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(api)
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
        Button {
            // Social login action
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.palmText)
                    .frame(width: 24)

                Text(text)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.palmText)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.palmBorder, lineWidth: 1.5)
            )
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(APIService.shared)
}
