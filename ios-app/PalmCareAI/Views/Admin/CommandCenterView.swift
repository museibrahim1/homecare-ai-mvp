import SwiftUI

@MainActor
class CommandCenterViewModel: ObservableObject {
    @Published var plan: OutreachWeeklyPlan?
    @Published var selectedDayIndex = 0
    @Published var loading = false
    @Published var error: String?
    @Published var sending = false

    func load(weekOffset: Int = 0) async {
        loading = true
        error = nil
        do {
            plan = try await APIService.shared.fetchWeeklyPlan(weekOffset: weekOffset)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    func approve(draftId: String, type: String) async {
        do {
            try await APIService.shared.approveDraft(draftId: draftId, type: type)
            await load()
        } catch let err { self.error = err.localizedDescription }
    }

    func markCalled(leadId: String, notes: String?) async {
        do {
            try await APIService.shared.markCalled(leadId: leadId, notes: notes)
            await load()
        } catch let err { self.error = err.localizedDescription }
    }

    func batchSend() async {
        sending = true
        do {
            _ = try await APIService.shared.batchSendEmails(dayIndex: selectedDayIndex)
            await load()
        } catch let err { self.error = err.localizedDescription }
        sending = false
    }

    var currentDay: OutreachDay? {
        guard let days = plan?.days, selectedDayIndex < days.count else { return nil }
        return days[selectedDayIndex]
    }
}

struct CommandCenterView: View {
    @StateObject private var vm = CommandCenterViewModel()
    @State private var tab: CCTab = .agencies

    enum CCTab: String, CaseIterable {
        case agencies = "Agencies"
        case investors = "Investors"
        case calls = "Calls"
    }

    var body: some View {
        VStack(spacing: 0) {
            if vm.loading && vm.plan == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = vm.error, vm.plan == nil {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Button("Retry") { Task { await vm.load() } }
                        .buttonStyle(.borderedProminent)
                        .tint(.palmPrimary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                dayPicker
                tabPicker
                contentView
            }
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Command Center")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task { await vm.batchSend() }
                } label: {
                    if vm.sending {
                        ProgressView()
                    } else {
                        Image(systemName: "paperplane.fill")
                    }
                }
                .disabled(vm.sending)
                .accessibilityLabel("Send all emails")
            }
        }
        .task { await vm.load() }
    }

    private var dayPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array((vm.plan?.days ?? []).enumerated()), id: \.offset) { idx, day in
                    Button {
                        vm.selectedDayIndex = idx
                    } label: {
                        VStack(spacing: 2) {
                            Text(shortDay(day.day_name ?? day.date))
                                .font(.caption2.weight(.medium))
                            Text(shortDate(day.date))
                                .font(.caption.weight(vm.selectedDayIndex == idx ? .bold : .regular))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(vm.selectedDayIndex == idx ? Color.palmPrimary : Color(UIColor.secondarySystemGroupedBackground))
                        .foregroundColor(vm.selectedDayIndex == idx ? .white : .primary)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    private var tabPicker: some View {
        Picker("Tab", selection: $tab) {
            ForEach(CCTab.allCases, id: \.self) { t in
                Text(t.rawValue).tag(t)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.bottom, 8)
    }

    @ViewBuilder
    private var contentView: some View {
        ScrollView {
            switch tab {
            case .agencies: agencyList
            case .investors: investorList
            case .calls: callsList
            }
        }
    }

    private var agencyList: some View {
        LazyVStack(spacing: 10) {
            let drafts = vm.currentDay?.agency_drafts ?? []
            if drafts.isEmpty {
                emptyState("No agency drafts for this day")
            } else {
                ForEach(drafts) { draft in
                    DraftCard(
                        name: draft.provider_name ?? "Unknown",
                        email: draft.contact_email ?? "",
                        subject: draft.draft_subject ?? "",
                        status: draft.status ?? "draft",
                        sentAt: draft.last_email_sent_at,
                        onApprove: { Task { await vm.approve(draftId: draft.id, type: "agency") } }
                    )
                }
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 20)
    }

    private var investorList: some View {
        LazyVStack(spacing: 10) {
            let drafts = vm.currentDay?.investor_drafts ?? []
            if drafts.isEmpty {
                emptyState("No investor drafts for this day")
            } else {
                ForEach(drafts) { draft in
                    DraftCard(
                        name: draft.fund_name ?? "Unknown",
                        email: draft.contact_email ?? "",
                        subject: draft.draft_subject ?? "",
                        status: draft.status ?? "draft",
                        sentAt: draft.last_email_sent_at,
                        onApprove: { Task { await vm.approve(draftId: draft.id, type: "investor") } }
                    )
                }
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 20)
    }

    private var callsList: some View {
        LazyVStack(spacing: 10) {
            let calls = vm.currentDay?.calls ?? []
            if calls.isEmpty {
                emptyState("No calls scheduled for this day")
            } else {
                ForEach(calls) { call in
                    CallCard(call: call) {
                        Task { await vm.markCalled(leadId: call.id, notes: nil) }
                    }
                }
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 20)
    }

    private func emptyState(_ message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "tray")
                .font(.title2)
                .foregroundColor(.secondary)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func shortDay(_ label: String) -> String {
        String(label.prefix(3))
    }

    private func shortDate(_ date: String) -> String {
        let parts = date.split(separator: "-")
        guard parts.count == 3 else { return date }
        return "\(parts[1])/\(parts[2])"
    }
}

struct DraftCard: View {
    let name: String
    let email: String
    let subject: String
    let status: String
    let sentAt: String?
    let onApprove: () -> Void

    private var isSent: Bool { sentAt != nil && !sentAt!.isEmpty }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmText)
                    Text(email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                statusBadge
            }
            if !subject.isEmpty {
                Text(subject)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            if !isSent {
                Button(action: onApprove) {
                    Label("Approve & Send", systemImage: "paperplane")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .tint(.palmPrimary)
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
    }

    private var statusBadge: some View {
        Text(isSent ? "Sent" : status.capitalized)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(isSent ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
            .foregroundColor(isSent ? .green : .orange)
            .cornerRadius(6)
    }
}

struct CallCard: View {
    let call: OutreachCall
    let onMarkCalled: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill((call.is_contacted ?? false) ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: (call.is_contacted ?? false) ? "checkmark.circle.fill" : "phone.fill")
                        .foregroundColor((call.is_contacted ?? false) ? .green : .orange)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(call.provider_name ?? "Unknown")
                    .font(.subheadline.weight(.semibold))
                Text(call.phone ?? "No phone")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            if !(call.is_contacted ?? false) {
                Button(action: onMarkCalled) {
                    Text("Done")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                }
                .buttonStyle(.borderedProminent)
                .tint(.palmPrimary)
            } else {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
    }
}
