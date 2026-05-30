import SwiftUI

struct ChangePasswordSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var success = false

    private var canSubmit: Bool {
        !currentPassword.isEmpty && newPassword.count >= 8 && newPassword == confirmPassword
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.palmPrimary.opacity(0.1))
                                .frame(width: 64, height: 64)
                            Image(systemName: "lock.rotation")
                                .font(.system(size: 26))
                                .foregroundColor(.palmPrimary)
                        }
                        Text("Change Password")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    .padding(.top, 8)

                    if success {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                            Text("Password updated successfully").font(.system(size: 14, weight: .medium)).foregroundColor(.green)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(Color.green.opacity(0.08))
                        .cornerRadius(12)
                    }

                    VStack(spacing: 14) {
                        passwordField("Current Password", text: $currentPassword)
                        passwordField("New Password", text: $newPassword)
                        passwordField("Confirm New Password", text: $confirmPassword)

                        if newPassword.count > 0 && newPassword.count < 8 {
                            Text("Password must be at least 8 characters")
                                .font(.system(size: 12))
                                .foregroundColor(.orange)
                        }

                        if !confirmPassword.isEmpty && newPassword != confirmPassword {
                            Text("Passwords don't match")
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                        }
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button { changePassword() } label: {
                        HStack {
                            if isLoading { ProgressView().tint(.white).scaleEffect(0.8) }
                            Text("Update Password")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canSubmit ? Color.palmPrimary : Color.palmSecondary.opacity(0.3))
                        .cornerRadius(12)
                    }
                    .disabled(!canSubmit || isLoading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func passwordField(_ placeholder: String, text: Binding<String>) -> some View {
        SecureField(placeholder, text: text)
            .font(.system(size: 14))
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.palmFieldBg)
            .cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
    }

    private func changePassword() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let _: [String: AnyCodable] = try await api.request(
                    "POST", path: "/auth/change-password",
                    body: ["current_password": currentPassword, "new_password": newPassword]
                )
                await MainActor.run {
                    isLoading = false
                    success = true
                    currentPassword = ""
                    newPassword = ""
                    confirmPassword = ""
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

// MARK: - Terms & Privacy Sheet

