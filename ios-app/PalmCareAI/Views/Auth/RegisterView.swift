import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var businessName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false

    var passwordsMatch: Bool {
        !password.isEmpty && password == confirmPassword
    }

    var formIsValid: Bool {
        !fullName.isEmpty && !email.isEmpty && !phone.isEmpty
            && !password.isEmpty && passwordsMatch
    }

    var body: some View {
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

                    VStack(alignment: .leading, spacing: 0) {
                        Text("Join the")
                            .font(.system(size: 30, weight: .black))
                            .foregroundColor(.palmText)
                            .tracking(-1)
                        Text("pros who")
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

                    (Text("Thousands of care professionals use PalmCare AI to ")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                    + Text("close faster, document smarter,")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.palmPrimaryDark)
                    + Text(" and never lose a client to paperwork again.")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary))
                    .lineSpacing(3)
                }
                .padding(.top, 12)
                .padding(.bottom, 20)

                // Divider
                HStack(spacing: 10) {
                    Rectangle().fill(Color.palmBorder).frame(height: 1)
                    Text("Create your free account")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                        .fixedSize()
                    Rectangle().fill(Color.palmBorder).frame(height: 1)
                }
                .padding(.bottom, 18)

                // Form fields
                VStack(spacing: 14) {
                    FormField(label: "Full Name", icon: "person", placeholder: "John Doe", text: $fullName)
                    FormField(label: "Business Name", icon: "building.2", placeholder: "Your agency name", text: $businessName, isRequired: false)
                    FormField(label: "Email address", icon: "envelope", placeholder: "john@example.com", text: $email, keyboardType: .emailAddress, contentType: .emailAddress)
                    FormField(label: "Phone Number", icon: "phone", placeholder: "(555) 123-4567", text: $phone, keyboardType: .phonePad, contentType: .telephoneNumber)

                    // Password
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Password")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.palmTextMuted)

                        HStack(spacing: 10) {
                            Image(systemName: "lock")
                                .font(.system(size: 15))
                                .foregroundColor(.palmSecondary)
                                .frame(width: 20)

                            SecureField("Create a password", text: $password)
                                .font(.system(size: 13))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.palmFieldBg)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
                    }

                    // Confirm Password
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Confirm Password")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.palmTextMuted)

                        HStack(spacing: 10) {
                            Image(systemName: "lock.shield")
                                .font(.system(size: 15))
                                .foregroundColor(.palmSecondary)
                                .frame(width: 20)

                            SecureField("Confirm your password", text: $confirmPassword)
                                .font(.system(size: 13))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.palmFieldBg)
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(
                                    !confirmPassword.isEmpty && !passwordsMatch ? Color.red.opacity(0.5) : Color.palmBorder,
                                    lineWidth: 1.5
                                )
                        )
                        .shadow(color: .black.opacity(0.03), radius: 1, y: 1)

                        if !confirmPassword.isEmpty && !passwordsMatch {
                            Text("Passwords do not match")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }
                .padding(.bottom, 18)

                // Register button
                Button { performRegister() } label: {
                    HStack {
                        if isLoading {
                            ProgressView().tint(.white)
                        }
                        Text("Create Account — Palm It")
                            .font(.system(size: 14, weight: .heavy))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background(
                        formIsValid
                            ? LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing)
                            : LinearGradient(colors: [Color.palmPrimary.opacity(0.4), Color.palmAccent.opacity(0.4)], startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(12)
                    .shadow(color: Color.palmPrimary.opacity(formIsValid ? 0.35 : 0), radius: 7, y: 3)
                }
                .disabled(!formIsValid || isLoading)
                .padding(.bottom, 10)

                // Login link
                HStack(spacing: 4) {
                    Text("Already a pro?")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                    Button { dismiss() } label: {
                        Text("Sign in →")
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
                .padding(.top, 16)
                .padding(.bottom, 16)
            }
            .padding(.horizontal, 22)
        }
        .background(Color.white)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button { dismiss() } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.palmTextMuted)
                        .frame(width: 32, height: 32)
                        .background(Color.white)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
                }
            }
        }
        .alert("Registration Failed", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
    }

    private func performRegister() {
        isLoading = true
        errorMessage = nil

        let body: [String: Any] = [
            "name": businessName.isEmpty ? fullName : businessName,
            "entity_type": "llc",
            "state_of_incorporation": "CA",
            "address": "",
            "city": "",
            "state": "CA",
            "zip_code": "00000",
            "phone": phone,
            "email": email,
            "owner_name": fullName,
            "owner_email": email,
            "owner_password": password,
        ]

        Task {
            do {
                try await api.register(body: body)
                let loginResponse = try await api.login(email: email, password: password)
                await MainActor.run {
                    if let token = loginResponse.access_token {
                        api.token = token
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

struct FormField: View {
    let label: String
    let icon: String
    let placeholder: String
    @Binding var text: String
    var isRequired: Bool = true
    var keyboardType: UIKeyboardType = .default
    var contentType: UITextContentType?

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 4) {
                Text(label)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmTextMuted)

                if !isRequired {
                    Text("(optional)")
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                }
            }

            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundColor(.palmSecondary)
                    .frame(width: 20)

                TextField(placeholder, text: $text)
                    .font(.system(size: 13))
                    .keyboardType(keyboardType)
                    .textContentType(contentType)
                    .autocapitalization(keyboardType == .emailAddress ? .none : .words)
                    .disableAutocorrection(keyboardType == .emailAddress)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.palmFieldBg)
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.03), radius: 1, y: 1)
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(APIService.shared)
    }
}
