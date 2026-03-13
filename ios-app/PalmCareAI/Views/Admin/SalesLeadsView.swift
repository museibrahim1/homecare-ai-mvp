import SwiftUI

@MainActor
class SalesLeadsViewModel: ObservableObject {
    @Published var leads: [SalesLead] = []
    @Published var loading = false
    @Published var error: String?
    @Published var searchText = ""

    var filteredLeads: [SalesLead] {
        guard !searchText.isEmpty else { return leads }
        let q = searchText.lowercased()
        return leads.filter {
            ($0.provider_name ?? "").lowercased().contains(q) ||
            ($0.contact_name ?? "").lowercased().contains(q) ||
            ($0.state ?? "").lowercased().contains(q)
        }
    }

    func load() async {
        loading = true
        error = nil
        do {
            leads = try await APIService.shared.fetchSalesLeads()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

struct SalesLeadsView: View {
    @StateObject private var vm = SalesLeadsViewModel()

    var body: some View {
        VStack(spacing: 0) {
            searchBar

            if vm.loading && vm.leads.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = vm.error, vm.leads.isEmpty {
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
                ScrollView {
                    LazyVStack(spacing: 8) {
                        Text("\(vm.filteredLeads.count) agencies")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                        ForEach(vm.filteredLeads) { lead in
                            LeadRow(lead: lead)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Sales Leads")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
    }

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            TextField("Search agencies...", text: $vm.searchText)
                .textFieldStyle(.plain)
                .font(.subheadline)
        }
        .padding(10)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}

struct LeadRow: View {
    let lead: SalesLead

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(lead.provider_name ?? "Unknown Agency")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmText)
                    if let contact = lead.contact_name, !contact.isEmpty {
                        Text(contact)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
                if let state = lead.state {
                    Text(state)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.palmPrimary.opacity(0.1))
                        .foregroundColor(.palmPrimary)
                        .cornerRadius(6)
                }
            }

            HStack(spacing: 12) {
                if let email = lead.contact_email, !email.isEmpty {
                    Label(email, systemImage: "envelope")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                if let count = lead.email_send_count, count > 0 {
                    Text("\(count) emails")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                statusBadge
            }

            if let phone = lead.phone, !phone.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "phone.fill")
                        .font(.caption2)
                        .foregroundColor(.palmPrimary)
                    if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                        Link(phone, destination: url)
                            .font(.caption)
                            .foregroundColor(.palmPrimary)
                    } else {
                        Text(phone)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .padding(.horizontal)
    }

    private var statusBadge: some View {
        Group {
            if lead.is_contacted == true {
                Label("Contacted", systemImage: "checkmark.circle.fill")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.green)
            } else {
                Text(lead.priority?.capitalized ?? "Normal")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.orange)
            }
        }
    }
}
