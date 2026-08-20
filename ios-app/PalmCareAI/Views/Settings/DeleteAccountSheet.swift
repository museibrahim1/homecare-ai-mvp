import SwiftUI

struct DeleteAccountSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var password: String = ""
    @State private var emailConfirm: String = ""
    @State private var typedConfirmation: String = ""
    @State private var acknowledgedDataLoss: Bool = false
    @State private var isDeleting: Bool = false
    @State private var errorMessage: String?
    @State private var hasPassword: Bool = true
    @State private var accountEmail: String = ""

    private let requiredConfirmation = "DELETE MY ACCOUNT"

    private var canDelete: Bool {
        let authOk = hasPassword ? !password.isEmpty : !emailConfirm.isEmpty
        return authOk
            && typedConfirmation == requiredConfirmation
            && acknowledgedDataLoss
            && !isDeleting
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    headerBlock
                    consequencesCard
                    confirmationFields
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 8)
                    }
                    deleteButton
                    Text("This action is permanent. Your account and data are purged within 30 days. Any active subscription is billed by Apple and must be cancelled separately in Settings → Apple ID → Subscriptions.")
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 40)
            }
            .background(PalmGlassBackground())
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .disabled(isDeleting)
                }
            }
            .task {
                if let user = try? await api.fetchUser(forceRefresh: true) {
                    hasPassword = user.has_password ?? true
                    accountEmail = user.email
                }
            }
        }
    }

    private var headerBlock: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.12))
                    .frame(width: 72, height: 72)
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundColor(.red)
            }
            Text("Delete your account?")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.palmText)
            Text("This will permanently delete your PALM account and remove access for everyone in your agency workspace.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 4)
    }

    private var consequencesCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            consequenceRow(icon: "person.crop.circle.badge.xmark", text: "Your login and profile will be removed")
            consequenceRow(icon: "waveform", text: "All visit recordings, transcripts, and contracts will be deleted")
            consequenceRow(icon: "person.2.fill", text: "Client records you created will be unlinked or removed")
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.06))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.red.opacity(0.18), lineWidth: 1))
        .cornerRadius(12)
    }

    private func consequenceRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.red.opacity(0.85))
                .frame(width: 18)
            Text(text)
                .font(.system(size: 13))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var confirmationFields: some View {
        VStack(alignment: .leading, spacing: 14) {
            if hasPassword {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Confirm your password")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.palmTextMuted)
                    SecureField("Current password", text: $password)
                        .font(.system(size: 14))
                        .textContentType(.password)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 11)
                        .background(Color.white.opacity(0.85))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Type your account email to confirm")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.palmTextMuted)
                    TextField(accountEmail.isEmpty ? "you@agency.com" : accountEmail, text: $emailConfirm)
                        .font(.system(size: 14))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(.horizontal, 12)
                        .padding(.vertical, 11)
                        .background(Color.white.opacity(0.85))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Type DELETE MY ACCOUNT to confirm")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmTextMuted)
                TextField(requiredConfirmation, text: $typedConfirmation)
                    .font(.system(size: 14, weight: .medium).monospaced())
                    .autocorrectionDisabled(true)
                    .textInputAutocapitalization(.characters)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 11)
                    .background(Color.white.opacity(0.85))
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(
                                typedConfirmation.isEmpty || typedConfirmation == requiredConfirmation
                                    ? Color.palmBorder
                                    : Color.red.opacity(0.5),
                                lineWidth: 1
                            )
                    )
            }

            Button { acknowledgedDataLoss.toggle() } label: {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: acknowledgedDataLoss ? "checkmark.square.fill" : "square")
                        .font(.system(size: 18))
                        .foregroundColor(acknowledgedDataLoss ? .red : .palmSecondary)
                    Text("I understand this action cannot be undone and all my data will be permanently lost.")
                        .font(.system(size: 12))
                        .foregroundColor(.palmText)
                        .multilineTextAlignment(.leading)
                    Spacer()
                }
            }
            .accessibilityLabel("Acknowledge permanent data loss")
        }
    }

    private var deleteButton: some View {
        Button {
            Task { await performDelete() }
        } label: {
            HStack {
                if isDeleting { ProgressView().tint(.white) }
                Text(isDeleting ? "Deleting…" : "Delete Account")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(canDelete ? Color.red : Color.red.opacity(0.4))
            .cornerRadius(12)
        }
        .disabled(!canDelete)
    }

    private func performDelete() async {
        isDeleting = true
        errorMessage = nil
        defer { isDeleting = false }
        do {
            if hasPassword {
                try await api.deleteAccount(password: password)
            } else {
                try await api.deleteAccount(emailConfirm: emailConfirm.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
