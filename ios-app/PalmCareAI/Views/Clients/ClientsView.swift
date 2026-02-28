import SwiftUI

struct ClientsView: View {
    @EnvironmentObject var api: APIService

    @State private var clients: [Client] = []
    @State private var searchText = ""
    @State private var isLoading = true

    var filteredClients: [Client] {
        if searchText.isEmpty { return clients }
        return clients.filter {
            $0.full_name.localizedCaseInsensitiveContains(searchText)
                || ($0.phone?.contains(searchText) ?? false)
                || ($0.primary_diagnosis?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    VStack {
                        Spacer()
                        ProgressView("Loading clients...")
                        Spacer()
                    }
                } else if clients.isEmpty {
                    VStack(spacing: 16) {
                        Spacer()

                        Image(systemName: "person.2.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.palmSecondary.opacity(0.4))

                        Text("No Clients Yet")
                            .font(.title3.weight(.semibold))
                            .foregroundColor(.palmText)

                        Text("Your clients will appear here once added.")
                            .font(.subheadline)
                            .foregroundColor(.palmSecondary)
                            .multilineTextAlignment(.center)

                        Spacer()
                    }
                    .padding(.horizontal, 40)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(filteredClients) { client in
                                ClientCard(client: client)
                            }

                            if filteredClients.isEmpty {
                                VStack(spacing: 8) {
                                    Image(systemName: "magnifyingglass")
                                        .font(.system(size: 32))
                                        .foregroundColor(.palmSecondary.opacity(0.4))

                                    Text("No results for \"\(searchText)\"")
                                        .font(.subheadline)
                                        .foregroundColor(.palmSecondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 120)
                    }
                }
            }
            .background(Color.palmBackground)
            .navigationTitle("Clients")
            .searchable(text: $searchText, prompt: "Search by name, phone, or diagnosis")
            .refreshable {
                await loadClients()
            }
            .task {
                await loadClients()
            }
        }
    }

    private func loadClients() async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run {
                clients = fetched
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

struct ClientCard: View {
    let client: Client

    var statusColor: Color {
        switch client.status.lowercased() {
        case "active": return .green
        case "inactive": return .palmSecondary
        case "pending": return .orange
        default: return .palmSecondary
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            // Avatar
            ZStack {
                Circle()
                    .fill(Color.palmPrimary.opacity(0.1))
                    .frame(width: 50, height: 50)

                Text(initials(for: client.full_name))
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.palmPrimary)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(client.full_name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmText)

                    Spacer()

                    Text(client.status.capitalized)
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(statusColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(statusColor.opacity(0.12))
                        .cornerRadius(6)
                }

                if let phone = client.phone, !phone.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "phone")
                            .font(.system(size: 10))
                        Text(phone)
                    }
                    .font(.caption)
                    .foregroundColor(.palmSecondary)
                }

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.text.square")
                            .font(.system(size: 10))
                        Text(diagnosis)
                    }
                    .font(.caption)
                    .foregroundColor(.palmSecondary)
                    .lineLimit(1)
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        let first = parts.first?.prefix(1) ?? ""
        let last = parts.count > 1 ? parts.last!.prefix(1) : ""
        return "\(first)\(last)".uppercased()
    }
}

#Preview {
    ClientsView()
        .environmentObject(APIService.shared)
}
