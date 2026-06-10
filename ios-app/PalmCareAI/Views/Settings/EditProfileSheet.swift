import SwiftUI

struct EditProfileSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    var user: User?

    @State private var fullName = ""
    @State private var phone = ""
    @State private var isLoading = false
    @State private var success = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 12) {
                        let initials = fullName
                            .split(separator: " ")
                            .map { String($0.prefix(1)) }
                            .joined()
                            .uppercased()

                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Color.palmPrimary, Color.palmAccent],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 72, height: 72)
                            .overlay(
                                Text(initials.isEmpty ? "U" : initials)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.white)
                            )
                            .shadow(color: Color.palmPrimary.opacity(0.3), radius: 8, y: 4)

                        Text("Edit Profile")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    .padding(.top, 8)

                    if success {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                            Text("Profile updated!").font(.system(size: 14, weight: .medium)).foregroundColor(.green)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(Color.green.opacity(0.08))
                        .cornerRadius(12)
                    }

                    VStack(spacing: 14) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Full Name")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "person")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)
                                TextField("Your name", text: $fullName)
                                    .font(.system(size: 14))
                                    .textContentType(.name)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg)
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        }

                        VStack(alignment: .leading, spacing: 5) {
                            Text("Phone")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "phone")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)
                                TextField("(555) 123-4567", text: $phone)
                                    .font(.system(size: 14))
                                    .keyboardType(.phonePad)
                                    .textContentType(.telephoneNumber)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg)
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        }

                        VStack(alignment: .leading, spacing: 5) {
                            Text("Email")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "envelope")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)
                                Text(user?.email ?? "")
                                    .font(.system(size: 14))
                                    .foregroundColor(.palmSecondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg.opacity(0.5))
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder.opacity(0.5), lineWidth: 1.5))
                        }
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button { saveProfile() } label: {
                        HStack {
                            if isLoading { ProgressView().tint(.white).scaleEffect(0.8) }
                            Text("Save Changes")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(fullName.isEmpty ? Color.palmSecondary.opacity(0.3) : Color.palmPrimary)
                        .cornerRadius(12)
                    }
                    .disabled(fullName.isEmpty || isLoading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear {
                fullName = user?.full_name ?? ""
                phone = user?.phone ?? ""
            }
        }
    }

    private func saveProfile() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                var body: [String: Any] = ["full_name": fullName]
                if !phone.isEmpty { body["phone"] = phone }
                _ = try await api.updateProfile(body: body)
                await MainActor.run {
                    isLoading = false
                    withAnimation { success = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { dismiss() }
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

// MARK: - Delete Account Sheet
// Implements Apple App Review Guideline 5.1.1(v): in-app initiated account deletion.

