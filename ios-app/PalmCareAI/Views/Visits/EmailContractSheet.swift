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
    /// Optional packet context (Paper Send). Passed from VisitDetailView when
    /// available so the sheet can show the "included" checklist + snapshot.
    var weeklyHours: Double?
    var hourlyRate: Double?
    var stateName: String?
    var agencyName: String?
    /// Real packet statuses for the Included checklist (Paper Send).
    var carePlanStatus: String = "Ready"
    var billablesStatus: String = "Ready"
    var notesStatus: String = "Ready"
    var contractStatus: String = "Ready"

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
            .background(PalmGlassBackground())
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                if recipientName.isEmpty, let name = clientName { recipientName = name }
            }
            .task { await loadStatus() }
        }
    }

    // MARK: - Header

    private var header: some View {
        // Pipeline Glass page header (Paper Send): client first-name eyebrow +
        // large "Send" title sitting directly on the mint wash.
        let ink = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255)
        let muted = Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255)
        let firstName: String = {
            let full = clientName ?? ""
            return full.split(separator: " ").first.map(String.init) ?? full
        }()

        return HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                if !firstName.isEmpty {
                    Text(firstName)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(muted)
                        .lineLimit(1)
                }
                Text("Send")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundColor(ink)
                    .tracking(-1.4)
            }
            Spacer()
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmSecondary)
                    .frame(width: 30, height: 30)
                    .background(Color.white.opacity(0.85))
                    .clipShape(Circle())
            }
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, 24)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Form

    private var formContent: some View {
        VStack(spacing: 0) {
            header

            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    introLine

                    includedCard

                    if let snapshot = agreementSnapshot {
                        snapshotCard(snapshot)
                    }

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
                            .background(Color.white.opacity(0.85))
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

    // MARK: - Paper Send: intro, included checklist, snapshot

    private var clientDisplayName: String {
        clientName ?? "your client"
    }

    private var stateAgreementLabel: String {
        if let state = stateName, !state.isEmpty {
            return "\(state) service agreement"
        }
        return "service agreement"
    }

    /// Title-cased variant for the checklist row (e.g. "Florida service agreement").
    private var packetAgreementTitle: String {
        if let state = stateName, !state.isEmpty {
            return "\(state) service agreement"
        }
        return "Service agreement"
    }

    private var introLine: some View {
        Text("Care plan, billables, visit note, and \(stateAgreementLabel.lowercased()) for \(clientDisplayName).")
            .font(.system(size: 14))
            .foregroundColor(.palmSecondary)
            .lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 4)
    }

    /// Billables subtitle uses whatever packet context we were handed.
    private var billablesSubtitle: String {
        var bits: [String] = []
        if let hours = weeklyHours { bits.append("\(Int(hours.rounded()))h") }
        if let hours = weeklyHours, let rate = hourlyRate {
            let weekly = hours * rate
            bits.append("$\(Int(weekly.rounded()))/wk")
        } else {
            bits.append("weekly")
        }
        return bits.joined(separator: " · ")
    }

    private var includedCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 7) {
                Image(systemName: "checklist")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                Text("Included")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }

            includedRow(icon: "list.clipboard.fill", title: "Care plan", subtitle: "From the visit", status: carePlanStatus)
            includedRow(icon: "dollarsign.circle.fill", title: "Billables", subtitle: billablesSubtitle, status: billablesStatus)
            includedRow(icon: "note.text", title: "SOAP visit note", subtitle: "Clinical documentation", status: notesStatus)
            includedRow(icon: "doc.text.fill", title: packetAgreementTitle, subtitle: contractTitle ?? "Home Care Service Agreement", status: contractStatus)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .palmGlassCard(radius: 20)
    }

    private func includedRow(icon: String, title: String, subtitle: String, status: String) -> some View {
        let approved = status.localizedCaseInsensitiveContains("approved")
        let ready = status.localizedCaseInsensitiveContains("ready")
        let tint: Color = approved ? .palmGreen : (ready ? .palmPrimary : .palmSecondary)
        return HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmPrimary)
                .frame(width: 34, height: 34)
                .background(Color.palmPrimary.opacity(0.1))
                .cornerRadius(9)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                    .lineLimit(1)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Text(status.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
                .foregroundColor(tint)
                .padding(.horizontal, 9)
                .padding(.vertical, 4)
                .background(
                    Capsule(style: .continuous)
                        .fill(tint.opacity(0.12))
                )
        }
    }

    /// Free-text snapshot of the agreement's rate + hours, when we have them.
    private var agreementSnapshot: String? {
        var sentences: [String] = []
        if let hours = weeklyHours, let rate = hourlyRate {
            let weekly = hours * rate
            sentences.append("\(Int(hours)) hours per week at $\(String(format: "%.0f", rate))/hour, about $\(String(format: "%.0f", weekly)) per week.")
        } else if let rate = hourlyRate {
            sentences.append("Billed at $\(String(format: "%.0f", rate)) per hour.")
        } else if let hours = weeklyHours {
            sentences.append("\(Int(hours)) hours of care per week.")
        }
        if let agency = agencyName, !agency.isEmpty {
            sentences.append("Provided by \(agency).")
        }
        return sentences.isEmpty ? nil : sentences.joined(separator: " ")
    }

    private func snapshotCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Image(systemName: "doc.plaintext")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                Text("Agreement Snapshot")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.palmText)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .palmGlassCard(radius: 20)
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
        .palmGlassCard(radius: 20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(isConnected ? Color.palmGreen.opacity(0.35) : Color.clear, lineWidth: 1)
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
        .palmGlassCard(radius: 20)
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
            .background(Color.white.opacity(0.85))
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
                    Text(isSending ? "Sending…" : "Send to family")
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
                errorMessage = "Couldn't check your email connection. Check your network and try again."
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
