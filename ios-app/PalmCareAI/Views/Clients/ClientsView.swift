import SwiftUI

struct ClientsView: View {
    @EnvironmentObject var api: APIService

    @State private var clients: [Client] = []
    @State private var searchText = ""
    @State private var isLoading = true
    @State private var showAddClient = false

    private static let avatarColors: [Color] = [
        Color(red: 13/255, green: 148/255, blue: 136/255),
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 220/255, green: 38/255, blue: 38/255),
        Color(red: 124/255, green: 58/255, blue: 237/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
        Color(red: 8/255, green: 145/255, blue: 178/255),
    ]

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
            VStack(spacing: 0) {
                VStack(spacing: 11) {
                    HStack {
                        Text("Clients")
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(.palmText)
                            .tracking(-0.4)

                        Spacer()

                        Button { showAddClient = true } label: {
                            HStack(spacing: 5) {
                                Image(systemName: "plus")
                                    .font(.system(size: 12, weight: .bold))
                                Text("Add Client")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                LinearGradient(
                                    colors: [Color.palmPrimary, Color.palmTeal600],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(10)
                            .shadow(color: Color.palmPrimary.opacity(0.35), radius: 5, y: 2)
                        }
                        .accessibilityLabel("Add new client")
                    }

                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14))
                            .foregroundColor(.palmSecondary)

                        TextField("Search name, phone, diagnosis...", text: $searchText)
                            .font(.system(size: 13))
                            .foregroundColor(.palmText)
                            .accessibilityLabel("Search clients")
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(Color.palmFieldBg)
                    .cornerRadius(10)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                }
                .padding(.horizontal, 18)
                .padding(.top, 14)
                .padding(.bottom, 14)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .overlay(
                    Rectangle().fill(Color.palmBorder).frame(height: 1),
                    alignment: .bottom
                )

                Group {
                    if isLoading {
                        VStack {
                            Spacer()
                            ProgressView("Loading clients...")
                                .foregroundColor(.palmSecondary)
                            Spacer()
                        }
                    } else if clients.isEmpty {
                        VStack(spacing: 16) {
                            Spacer()
                            Image(systemName: "person.2.slash")
                                .font(.system(size: 48))
                                .foregroundColor(.palmSecondary.opacity(0.4))
                            Text("No Clients Yet")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.palmText)
                            Text("Your clients will appear here once added.")
                                .font(.system(size: 13))
                                .foregroundColor(.palmSecondary)
                                .multilineTextAlignment(.center)
                            Spacer()
                        }
                        .padding(.horizontal, 40)
                    } else {
                        ScrollView(showsIndicators: false) {
                            LazyVStack(spacing: 10) {
                                ForEach(filteredClients) { client in
                                    NavigationLink(destination: ClientDetailView(client: client).environmentObject(api)) {
                                        ClientCard(client: client, avatarColors: Self.avatarColors)
                                    }
                                    .accessibilityLabel("View \(client.full_name)")
                                    .buttonStyle(.plain)
                                }

                                if filteredClients.isEmpty {
                                    VStack(spacing: 8) {
                                        Image(systemName: "magnifyingglass")
                                            .font(.system(size: 32))
                                            .foregroundColor(.palmSecondary.opacity(0.4))
                                        Text("No results for \"\(searchText)\"")
                                            .font(.system(size: 13))
                                            .foregroundColor(.palmSecondary)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.top, 40)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            .padding(.bottom, 100)
                        }
                    }
                }
            }
            .background(Color.palmBackground)
            .refreshable { await loadClients() }
            .task { await loadClients() }
            .sheet(isPresented: $showAddClient) {
                AddClientSheet(onClientCreated: { newClient in
                    clients.insert(newClient, at: 0)
                })
                .environmentObject(api)
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
            await MainActor.run { isLoading = false }
        }
    }
}

struct ClientCard: View {
    let client: Client
    let avatarColors: [Color]

    private var initials: String {
        client.full_name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
    }

    private var avatarColor: Color {
        avatarColors[abs(client.full_name.hashValue) % avatarColors.count]
    }

    private var statusColor: Color {
        switch (client.status ?? "active").lowercased() {
        case "active": return .palmGreen
        case "inactive": return .palmOrange
        case "discharged": return .palmSecondary
        default: return .palmGreen
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 12)
                .fill(avatarColor)
                .frame(width: 44, height: 44)
                .overlay(
                    Text(initials)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(client.full_name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)

                    Circle()
                        .fill(statusColor)
                        .frame(width: 6, height: 6)

                    if let careLevel = client.care_level, !careLevel.isEmpty {
                        Text(careLevel)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.palmPink)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.palmPink.opacity(0.1))
                            .cornerRadius(4)
                    }
                }

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis)
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                        .lineLimit(1)
                }

                HStack(spacing: 8) {
                    if let phone = client.phone, !phone.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 9))
                                .foregroundColor(.palmPrimary)
                            Text(phone)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                    if let city = client.city, !city.isEmpty {
                        HStack(spacing: 3) {
                            Image(systemName: "mappin")
                                .font(.system(size: 8))
                                .foregroundColor(.palmSecondary)
                            Text(city)
                                .font(.system(size: 11))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmSecondary.opacity(0.5))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }
}

#Preview {
    ClientsView()
        .environmentObject(APIService.shared)
}
