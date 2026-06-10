import SwiftUI

struct DeleteAccountSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var password: String = ""
    @State private var typedConfirmation: String = ""
    @State private var acknowledgedDataLoss: Bool = false
    @State private var isDeleting: Bool = false
    @State private var errorMessage: String?

    private let requiredConfirmation = "DELETE MY ACCOUNT"

    private var canDelete: Bool {
        !password.isEmpty
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
                    Text("This action is permanent. Account data is purged within 30 days. Subscriptions and billing managed through the App Store must also be cancelled separately in Settings → Apple ID → Subscriptions.")
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 40)
            }
            .background(Color.palmBackground)
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .disabled(isDeleting)
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
            consequenceRow(icon: "creditcard.trianglebadge.exclamationmark", text: "Active subscriptions are not auto-refunded — cancel in App Store separately")
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
            VStack(alignment: .leading, spacing: 6) {
                Text("Confirm your password")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmTextMuted)
                SecureField("Current password", text: $password)
                    .font(.system(size: 14))
                    .textContentType(.password)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 11)
                    .background(Color.palmFieldBg)
                    .cornerRadius(10)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
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
                    .background(Color.palmFieldBg)
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
        Button { Task { await performDelete() } } label: {
            HStack(spacing: 8) {
                if isDeleting {
                    ProgressView().tint(.white).scaleEffect(0.85)
                }
                Text(isDeleting ? "Deleting…" : "Delete my account permanently")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(canDelete ? Color.red : Color.red.opacity(0.35))
            .cornerRadius(12)
        }
        .disabled(!canDelete)
        .accessibilityLabel("Delete account permanently")
    }

    private func performDelete() async {
        await MainActor.run {
            isDeleting = true
            errorMessage = nil
        }
        do {
            try await api.deleteAccount(password: password)
            await MainActor.run {
                isDeleting = false
                dismiss()
            }
        } catch {
            await MainActor.run {
                isDeleting = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
