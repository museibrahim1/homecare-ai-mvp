import SwiftUI

// MARK: - Support Home (ticket list + new ticket)

struct SupportView: View {
    @EnvironmentObject var api: APIService

    @State private var tickets: [SupportTicketSummary] = []
    @State private var isLoading = true
    @State private var loadFailed = false
    @State private var showNewTicket = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                newTicketCard

                if isLoading {
                    ProgressView()
                        .padding(.top, 40)
                } else if loadFailed {
                    VStack(spacing: 10) {
                        Text("Couldn't load your tickets")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.palmSecondary)
                        Button("Try Again") { Task { await load() } }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                    }
                    .padding(.top, 30)
                } else if tickets.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.bubble")
                            .font(.system(size: 30))
                            .foregroundColor(.palmSecondary.opacity(0.5))
                        Text("No tickets yet")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                    .padding(.top, 40)
                } else {
                    ticketList
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 40)
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Support")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showNewTicket) {
            NewTicketSheet(onSubmitted: { Task { await load() } })
                .environmentObject(api)
        }
        .task { await load() }
    }

    private var newTicketCard: some View {
        Button { showNewTicket = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "plus.bubble.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .cornerRadius(10)

                VStack(alignment: .leading, spacing: 2) {
                    Text("New Support Request")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmText)
                    Text("Report a bug, ask a question, or request a feature")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmBorder)
            }
            .padding(14)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
        .accessibilityLabel("Create new support request")
    }

    private var ticketList: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Your Tickets")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmSecondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                ForEach(Array(tickets.enumerated()), id: \.element.id) { index, ticket in
                    NavigationLink {
                        SupportTicketDetailView(ticketId: ticket.id)
                            .environmentObject(api)
                    } label: {
                        ticketRow(ticket)
                    }
                    if index < tickets.count - 1 {
                        Rectangle()
                            .fill(Color.palmBorder.opacity(0.5))
                            .frame(height: 1)
                            .padding(.leading, 14)
                    }
                }
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    private func ticketRow(_ ticket: SupportTicketSummary) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(ticket.subject)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.palmText)
                    .lineLimit(1)
                Text(ticket.ticket_number)
                    .font(.system(size: 11).monospaced())
                    .foregroundColor(.palmSecondary)
            }

            Spacer()

            Text(ticket.displayStatus)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(statusColor(ticket.status))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(statusColor(ticket.status).opacity(0.1))
                .cornerRadius(8)

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.palmBorder)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func load() async {
        isLoading = true
        loadFailed = false
        do {
            tickets = try await api.fetchSupportTickets()
            isLoading = false
        } catch {
            isLoading = false
            loadFailed = true
        }
    }
}

func statusColor(_ status: String) -> Color {
    switch status {
    case "open": return .palmOrange
    case "in_progress": return .palmBlue
    case "waiting_on_customer": return .palmPurple
    case "resolved", "closed": return .palmGreen
    default: return .palmSecondary
    }
}

// MARK: - New Ticket Sheet

struct NewTicketSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss
    var onSubmitted: () -> Void

    @State private var subject = ""
    @State private var description = ""
    @State private var category = "bug_report"
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var submittedNumber: String?
    @FocusState private var focused: Bool

    private let categories: [(String, String, String)] = [
        ("bug_report", "Bug or Problem", "ladybug"),
        ("technical", "Technical Help", "wrench.and.screwdriver"),
        ("feature_request", "Feature Request", "lightbulb"),
        ("account", "Account", "person.crop.circle"),
        ("general", "Something Else", "bubble.left"),
    ]

    private var canSubmit: Bool {
        subject.trimmingCharacters(in: .whitespaces).count >= 3
            && description.trimmingCharacters(in: .whitespaces).count >= 10
            && !isSubmitting
    }

    var body: some View {
        NavigationStack {
            if let number = submittedNumber {
                successView(number)
            } else {
                form
            }
        }
        .presentationDetents([.large])
    }

    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("WHAT'S THIS ABOUT?")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)

                    ForEach(categories, id: \.0) { value, label, icon in
                        Button { category = value } label: {
                            HStack(spacing: 10) {
                                Image(systemName: icon)
                                    .font(.system(size: 14))
                                    .foregroundColor(category == value ? .palmPrimary : .palmSecondary)
                                    .frame(width: 22)
                                Text(label)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.palmText)
                                Spacer()
                                Image(systemName: category == value ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 17))
                                    .foregroundColor(category == value ? .palmPrimary : .palmBorder)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 11)
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(category == value ? Color.palmPrimary.opacity(0.4) : Color.palmBorder, lineWidth: 1)
                            )
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("SUBJECT")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)

                    TextField("Brief summary", text: $subject)
                        .font(.system(size: 14))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("DETAILS")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)

                    TextEditor(text: $description)
                        .font(.system(size: 14))
                        .frame(minHeight: 120)
                        .padding(10)
                        .scrollContentBackground(.hidden)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                        .focused($focused)

                    Text("Include what you were doing and what went wrong — it helps us fix it faster.")
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                }

                if let error = errorMessage {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundColor(.red)
                }

                Button(action: submit) {
                    ZStack {
                        Text("Submit")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .opacity(isSubmitting ? 0 : 1)
                        if isSubmitting {
                            ProgressView().tint(.white)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(canSubmit ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
                    )
                }
                .disabled(!canSubmit)
            }
            .padding(20)
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Contact Support")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Cancel") { dismiss() }
            }
        }
    }

    private func successView(_ number: String) -> some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 52))
                .foregroundColor(.palmGreen)

            Text("Request received")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.palmText)

            Text("Ticket \(number) was created.\nWe'll email you when there's an update.")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)

            Button { dismiss() } label: {
                Text("Done")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.palmPrimary))
            }
            .padding(.horizontal, 40)
            .padding(.top, 12)

            Spacer()
        }
        .background(Color(UIColor.systemGroupedBackground))
    }

    private func submit() {
        focused = false
        isSubmitting = true
        errorMessage = nil
        Task {
            do {
                let ticket = try await api.createSupportTicket(
                    subject: subject.trimmingCharacters(in: .whitespaces),
                    description: description.trimmingCharacters(in: .whitespaces),
                    category: category
                )
                await MainActor.run {
                    isSubmitting = false
                    submittedNumber = ticket.ticket_number
                    onSubmitted()
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = error.palmFriendlyMessage
                }
            }
        }
    }
}

// MARK: - Ticket Detail

struct SupportTicketDetailView: View {
    @EnvironmentObject var api: APIService
    let ticketId: String

    @State private var ticket: SupportTicketDetail?
    @State private var isLoading = true
    @State private var loadFailed = false
    @State private var reply = ""
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if loadFailed {
                VStack(spacing: 10) {
                    Text("Couldn't load this ticket")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.palmSecondary)
                    Button("Try Again") { Task { await load() } }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let ticket {
                content(ticket)
            }
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle(ticket?.ticket_number ?? "Ticket")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func content(_ ticket: SupportTicketDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(ticket.subject)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.palmText)
                        Spacer()
                        Text(ticket.displayStatus)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(statusColor(ticket.status))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(statusColor(ticket.status).opacity(0.1))
                            .cornerRadius(8)
                    }

                    Text(ticket.description)
                        .font(.system(size: 13))
                        .foregroundColor(.palmText.opacity(0.85))
                }
                .padding(14)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))

                if let resolution = ticket.resolution, !resolution.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Label("Resolution", systemImage: "checkmark.seal.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.palmGreen)
                        Text(resolution)
                            .font(.system(size: 13))
                            .foregroundColor(.palmText.opacity(0.85))
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.palmGreen.opacity(0.06))
                    .cornerRadius(14)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmGreen.opacity(0.25), lineWidth: 1))
                }

                if !ticket.replies.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("CONVERSATION")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.palmSecondary)

                        ForEach(ticket.replies) { r in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(r.from_support ? "PALM Support" : "You")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(r.from_support ? .palmPrimary : .palmSecondary)
                                Text(r.message)
                                    .font(.system(size: 13))
                                    .foregroundColor(.palmText.opacity(0.9))
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(
                                r.from_support ? Color.palmPrimary.opacity(0.25) : Color.palmBorder, lineWidth: 1))
                        }
                    }
                }

                if ticket.status != "closed" {
                    VStack(alignment: .leading, spacing: 8) {
                        TextField("Add a reply...", text: $reply, axis: .vertical)
                            .font(.system(size: 14))
                            .lineLimit(3...6)
                            .padding(12)
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))

                        if let error = errorMessage {
                            Text(error)
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                        }

                        Button(action: send) {
                            ZStack {
                                Text("Send Reply")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white)
                                    .opacity(isSending ? 0 : 1)
                                if isSending {
                                    ProgressView().tint(.white).scaleEffect(0.8)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(reply.trimmingCharacters(in: .whitespaces).isEmpty || isSending
                                          ? Color.palmPrimary.opacity(0.4) : Color.palmPrimary)
                            )
                        }
                        .disabled(reply.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 40)
        }
    }

    private func load() async {
        isLoading = true
        loadFailed = false
        do {
            ticket = try await api.fetchSupportTicket(id: ticketId)
            isLoading = false
        } catch {
            isLoading = false
            loadFailed = true
        }
    }

    private func send() {
        isSending = true
        errorMessage = nil
        Task {
            do {
                let updated = try await api.replyToSupportTicket(
                    id: ticketId,
                    message: reply.trimmingCharacters(in: .whitespaces)
                )
                await MainActor.run {
                    ticket = updated
                    reply = ""
                    isSending = false
                }
            } catch {
                await MainActor.run {
                    isSending = false
                    errorMessage = error.palmFriendlyMessage
                }
            }
        }
    }
}
