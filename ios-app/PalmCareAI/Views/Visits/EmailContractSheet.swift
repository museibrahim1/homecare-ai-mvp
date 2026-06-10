import SwiftUI

/// Sheet for emailing the generated Service Agreement (PDF) to a recipient —
/// the client, a family member, or another agency. Calls the backend, which
/// renders the contract PDF and sends it with reply-to set to the caregiver.
struct EmailContractSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    let visitId: String
    var clientName: String?
    var contractTitle: String?

    @State private var recipientEmail = ""
    @State private var recipientName = ""
    @State private var ccEmail = ""
    @State private var message = ""

    @State private var isSending = false
    @State private var errorMessage: String?
    @State private var didSend = false
    @State private var sentTo = ""

    @StateObject private var connector = EmailSenderConnector()
    @State private var sender: EmailSenderStatus?
    @State private var loadingStatus = true

    private var trimmedRecipient: String {
        recipientEmail.trimmingCharacters(in: .whitespaces)
    }

    private var isValidEmail: Bool {
        let r = trimmedRecipient
        guard let at = r.firstIndex(of: "@"), at != r.startIndex else { return false }
        let domain = r[r.index(after: at)...]
        return domain.contains(".") && !domain.hasSuffix(".")
    }

    private var ccIsValidOrEmpty: Bool {
        let cc = ccEmail.trimmingCharacters(in: .whitespaces)
        if cc.isEmpty { return true }
        guard let at = cc.firstIndex(of: "@"), at != cc.startIndex else { return false }
        let domain = cc[cc.index(after: at)...]
        return domain.contains(".") && !domain.hasSuffix(".")
    }

    private var isConnected: Bool { sender?.connected == true }

    private var canSend: Bool { isConnected && isValidEmail && ccIsValidOrEmpty && !isSending }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                if didSend {
                    successState
                } else {
                    formContent
                    submitBar
                }
            }
            .background(Color.palmBackground.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                if recipientName.isEmpty, let name = clientName { recipientName = name }
            }
            .task { await loadStatus() }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text("Email Agreement")
                .font(.system(size: 19, weight: .heavy))
                .foregroundColor(.palmText)
                .tracking(-0.4)
            Spacer()
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmSecondary)
                    .frame(width: 30, height: 30)
                    .background(Color.palmFieldBg)
                    .clipShape(Circle())
            }
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 12)
        .background(Color(UIColor.systemBackground))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.palmBorder.opacity(0.7)).frame(height: 1)
        }
    }

    // MARK: - Form

    private var formContent: some View {
        VStack(spacing: 0) {
            header

            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    attachmentCard

                    fromCard

                    sectionCard(title: "Send To", icon: "person.crop.circle") {
                        field("Recipient Email", text: $recipientEmail, placeholder: "client@email.com",
                              icon: "envelope.fill", keyboard: .emailAddress, content: .emailAddress)
                        if !trimmedRecipient.isEmpty && !isValidEmail {
                            inlineHint("Enter a valid email address", color: .palmOrange)
                        }
                        field("Recipient Name (optional)", text: $recipientName, placeholder: "Jane Doe",
                              icon: "person.fill", content: .name)
                        field("CC (optional)", text: $ccEmail, placeholder: "family@email.com",
                              icon: "person.2.fill", keyboard: .emailAddress, content: .emailAddress)
                        if !ccIsValidOrEmpty {
                            inlineHint("CC email is not valid", color: .palmOrange)
                        }
                    }

                    sectionCard(title: "Message (optional)", icon: "text.bubble") {
                        TextField("Add a short note for the recipient…", text: $message, axis: .vertical)
                            .font(.system(size: 15))
                            .foregroundColor(.palmText)
                            .lineLimit(3...6)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 13)
                            .background(Color.palmFieldBg)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                    }

                    if let error = errorMessage {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 13))
                            Text(error)
                                .font(.system(size: 13))
                        }
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 14)
                .padding(.bottom, 120)
            }
        }
    }

    private var attachmentCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "doc.richtext.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.palmPrimary)
                .frame(width: 44, height: 44)
                .background(Color.palmPrimary.opacity(0.1))
                .cornerRadius(11)
            VStack(alignment: .leading, spacing: 3) {
                Text(contractTitle ?? "Home Care Service Agreement")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                    .lineLimit(2)
                Text("PDF attachment\(clientName.map { " · \($0)" } ?? "")")
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder.opacity(0.7), lineWidth: 1))
    }

    /// Shows the connected sending mailbox, or a prompt to connect one. The
    /// agreement is always sent from the agency's own business email.
    private var fromCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 7) {
                Image(systemName: "paperplane.circle.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                Text("From")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                    .textCase(.uppercase)
                    .tracking(0.5)
                Spacer()
                if loadingStatus {
                    ProgressView().scaleEffect(0.7)
                }
            }

            if isConnected {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.palmGreen)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(sender?.address ?? "Your business email")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmText)
                            .lineLimit(1)
                        Text("Sends from your inbox · in your Sent folder")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                    }
                    Spacer(minLength: 0)
                }
            } else if !loadingStatus {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Connect your business email to send the agreement from your own address. Recipients see it coming directly from you.")
                        .font(.system(size: 13))
                        .foregroundColor(.palmSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Button { Task { await connect() } } label: {
                        HStack(spacing: 8) {
                            if connector.isConnecting {
                                ProgressView().tint(.white).scaleEffect(0.8)
                            } else {
                                Image(systemName: "link")
                                    .font(.system(size: 14, weight: .bold))
                            }
                            Text(connector.isConnecting ? "Connecting…" : "Connect Business Email")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color.palmPrimary)
                        .cornerRadius(12)
                    }
                    .disabled(connector.isConnecting)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isConnected ? Color.palmGreen.opacity(0.35) : Color.palmBorder.opacity(0.7), lineWidth: 1)
        )
    }

    private func sectionCard<Content: View>(title: String, icon: String,
                                            @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 7) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder.opacity(0.7), lineWidth: 1))
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String,
                       icon: String, keyboard: UIKeyboardType = .default,
                       content: UITextContentType? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(.palmSecondary)
                    .accessibilityHidden(true)
                TextField(placeholder, text: text)
                    .font(.system(size: 15))
                    .foregroundColor(.palmText)
                    .keyboardType(keyboard)
                    .textContentType(content)
                    .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                    .autocorrectionDisabled(keyboard == .emailAddress)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(Color.palmFieldBg)
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    private func inlineHint(_ text: String, color: Color) -> some View {
        HStack(spacing: 5) {
            Image(systemName: "exclamationmark.circle.fill").font(.system(size: 11))
            Text(text).font(.system(size: 12))
        }
        .foregroundColor(color)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Submit Bar

    private var submitBar: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.palmBorder.opacity(0.6)).frame(height: 1)
            Button { Task { await send() } } label: {
                HStack(spacing: 8) {
                    if isSending {
                        ProgressView().tint(.white).scaleEffect(0.85)
                    } else {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 14, weight: .bold))
                    }
                    Text(isSending ? "Sending…" : "Send Agreement")
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(colors: [.palmPrimary, .palmTeal600], startPoint: .leading, endPoint: .trailing)
                        .opacity(canSend ? 1 : 0.4)
                )
                .cornerRadius(14)
                .shadow(color: Color.palmPrimary.opacity(canSend ? 0.3 : 0), radius: 8, y: 4)
            }
            .disabled(!canSend)
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 28)
        }
        .background(.ultraThinMaterial)
    }

    // MARK: - Success

    private var successState: some View {
        VStack(spacing: 16) {
            Spacer()
            ZStack {
                Circle().fill(Color.palmGreen.opacity(0.12)).frame(width: 96, height: 96)
                Image(systemName: "checkmark")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.palmGreen)
            }
            Text("Agreement Sent")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.palmText)
            Text("The service agreement was emailed to\n\(sentTo).")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
            Spacer()
            Button { dismiss() } label: {
                Text("Done")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.palmPrimary)
                    .cornerRadius(14)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 28)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Actions

    private func loadStatus() async {
        loadingStatus = true
        do {
            let status = try await api.emailSenderStatus()
            await MainActor.run {
                sender = status
                loadingStatus = false
            }
        } catch {
            await MainActor.run {
                sender = EmailSenderStatus(connected: false, address: nil, provider: nil)
                loadingStatus = false
                // Don't silently show the "connect" UI when the status check
                // itself failed — the user may already be connected.
                errorMessage = "Couldn't check your email connection. Pull to retry or check your network."
            }
        }
    }

    private func connect() async {
        errorMessage = nil
        do {
            let status = try await connector.connect(api: api)
            await MainActor.run { sender = status }
        } catch let e as EmailSenderConnector.ConnectError {
            if case .cancelled = e { return }
            await MainActor.run { errorMessage = e.localizedDescription }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
    }

    private func send() async {
        guard canSend else { return }
        isSending = true
        errorMessage = nil
        do {
            _ = try await api.emailContract(
                visitId: visitId,
                recipientEmail: trimmedRecipient,
                recipientName: recipientName,
                ccEmail: ccEmail,
                message: message
            )
            await MainActor.run {
                sentTo = trimmedRecipient
                isSending = false
                withAnimation { didSend = true }
            }
        } catch {
            await MainActor.run {
                isSending = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
