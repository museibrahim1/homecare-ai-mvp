import SwiftUI

@MainActor
class InvestorsViewModel: ObservableObject {
    @Published var investors: [InvestorRecord] = []
    @Published var loading = false
    @Published var error: String?
    @Published var searchText = ""

    var filteredInvestors: [InvestorRecord] {
        guard !searchText.isEmpty else { return investors }
        let q = searchText.lowercased()
        return investors.filter {
            ($0.fund_name ?? "").lowercased().contains(q) ||
            ($0.contact_name ?? "").lowercased().contains(q)
        }
    }

    func load() async {
        loading = true
        error = nil
        do {
            investors = try await APIService.shared.fetchInvestors()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

struct InvestorsView: View {
    @StateObject private var vm = InvestorsViewModel()

    var body: some View {
        VStack(spacing: 0) {
            searchBar

            if vm.loading && vm.investors.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = vm.error, vm.investors.isEmpty {
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
                        Text("\(vm.filteredInvestors.count) investors")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                        ForEach(vm.filteredInvestors) { investor in
                            InvestorRow(investor: investor)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Investors")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
    }

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            TextField("Search investors...", text: $vm.searchText)
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

struct InvestorRow: View {
    let investor: InvestorRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(investor.fund_name ?? "Unknown Fund")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmText)
                    if let contact = investor.contact_name, !contact.isEmpty {
                        Text(contact)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
                if let type = investor.investor_type {
                    Text(type.capitalized)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.purple.opacity(0.1))
                        .foregroundColor(.purple)
                        .cornerRadius(6)
                }
            }

            HStack(spacing: 12) {
                if let email = investor.contact_email, !email.isEmpty {
                    Label(email, systemImage: "envelope")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                if let count = investor.email_send_count, count > 0 {
                    Text("\(count) emails")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                statusBadge
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .padding(.horizontal)
    }

    private var statusBadge: some View {
        Group {
            let status = investor.status ?? "new"
            Text(status.capitalized)
                .font(.caption2.weight(.bold))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(statusColor.opacity(0.12))
                .foregroundColor(statusColor)
                .cornerRadius(6)
        }
    }

    private var statusColor: Color {
        switch investor.status?.lowercased() {
        case "interested", "committed": return .green
        case "contacted", "meeting_scheduled": return .blue
        case "passed": return .red
        default: return .orange
        }
    }
}
