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
        ScrollView {
            VStack(spacing: 24) {
                Spacer().frame(height: 12)

                // Header
                VStack(spacing: 8) {
                    Text("Create account")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.palmText)

                    Text("Fill in your details to get started")
                        .font(.subheadline)
                        .foregroundColor(.palmSecondary)
                }

                // Form fields
                VStack(spacing: 16) {
                    FormField(
                        label: "Full Name",
                        icon: "person",
                        placeholder: "John Doe",
                        text: $fullName
                    )

                    FormField(
                        label: "Business Name",
                        icon: "building.2",
                        placeholder: "Optional",
                        text: $businessName,
                        isRequired: false
                    )

                    FormField(
                        label: "Email",
                        icon: "envelope",
                        placeholder: "john@example.com",
                        text: $email,
                        keyboardType: .emailAddress,
                        contentType: .emailAddress
                    )

                    FormField(
                        label: "Phone Number",
                        icon: "phone",
                        placeholder: "(555) 123-4567",
                        text: $phone,
                        keyboardType: .phonePad,
                        contentType: .telephoneNumber
                    )

                    // Password
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(.palmText)

                        HStack(spacing: 12) {
                            Image(systemName: "lock")
                                .foregroundColor(.palmSecondary)
                                .frame(width: 20)

                            SecureField("Create a password", text: $password)
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

                    // Confirm password
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Confirm Password")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(.palmText)

                        HStack(spacing: 12) {
                            Image(systemName: "lock.shield")
                                .foregroundColor(.palmSecondary)
                                .frame(width: 20)

                            SecureField("Confirm your password", text: $confirmPassword)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Color.palmFieldBg)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(
                                    !confirmPassword.isEmpty && !passwordsMatch
                                        ? Color.red.opacity(0.5)
                                        : Color.palmBorder,
                                    lineWidth: 1
                                )
                        )

                        if !confirmPassword.isEmpty && !passwordsMatch {
                            Text("Passwords do not match")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }

                // Register button
                Button {
                    performRegister()
                } label: {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        }
                        Text("Register")
                            .font(.body.weight(.semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(formIsValid ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
                    .cornerRadius(12)
                }
                .disabled(!formIsValid || isLoading)

                // Login link
                HStack(spacing: 4) {
                    Text("Already have an account?")
                        .font(.subheadline)
                        .foregroundColor(.palmSecondary)

                    Button {
                        dismiss()
                    } label: {
                        Text("Login")
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
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.palmText)
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
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text(label)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.palmText)

                if !isRequired {
                    Text("(optional)")
                        .font(.caption)
                        .foregroundColor(.palmSecondary)
                }
            }

            HStack(spacing: 12) {
                Image(systemName: icon)
                    .foregroundColor(.palmSecondary)
                    .frame(width: 20)

                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .textContentType(contentType)
                    .autocapitalization(keyboardType == .emailAddress ? .none : .words)
                    .disableAutocorrection(keyboardType == .emailAddress)
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
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(APIService.shared)
    }
}
