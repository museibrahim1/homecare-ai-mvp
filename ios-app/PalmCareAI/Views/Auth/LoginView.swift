import SwiftUI

extension Color {
    static let palmPrimary = Color(red: 37/255, green: 99/255, blue: 235/255)       // #2563EB
    static let palmFieldBg = Color(red: 249/255, green: 250/255, blue: 251/255)     // #F9FAFB
    static let palmBorder = Color(red: 243/255, green: 244/255, blue: 246/255)      // #F3F4F6
    static let palmText = Color(red: 17/255, green: 24/255, blue: 39/255)           // #111827
    static let palmSecondary = Color(red: 107/255, green: 114/255, blue: 128/255)   // #6B7280
    static let palmTeal = Color(red: 13/255, green: 148/255, blue: 136/255)         // #0D9488
}

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

                    // Shield icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.palmPrimary.opacity(0.1))
                            .frame(width: 72, height: 72)

                        Image(systemName: "shield.checkered")
                            .font(.system(size: 32, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                    }

                    // Title
                    VStack(spacing: 8) {
                        Text("Sign in to your Account")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(.palmText)

                        Text("Welcome back! Please enter your details.")
                            .font(.subheadline)
                            .foregroundColor(.palmSecondary)
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
                            Text("Log In")
                                .font(.body.weight(.semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.palmPrimary)
                        .cornerRadius(12)
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
