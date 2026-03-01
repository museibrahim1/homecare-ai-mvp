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
                // Top bar
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
                    }

                    // Search bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14))
                            .foregroundColor(.palmSecondary)

                        TextField("Search name, phone, diagnosis…", text: $searchText)
                            .font(.system(size: 12))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(Color.palmFieldBg)
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                }
                .padding(.horizontal, 18)
                .padding(.top, 14)
                .padding(.bottom, 14)
                .background(Color.white)
                .overlay(
                    Rectangle().fill(Color.palmBorder).frame(height: 1),
                    alignment: .bottom
                )

                // Client list
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
                        ScrollView(showsIndicators: false) {
                            LazyVStack(spacing: 8) {
                                ForEach(filteredClients) { client in
                                    NavigationLink(destination: ClientDetailView(client: client).environmentObject(api)) {
                                        ClientCard(client: client, avatarColors: Self.avatarColors)
                                    }
                                    .buttonStyle(.plain)
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
                            .padding(.horizontal, 14)
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

    var body: some View {
        HStack(spacing: 11) {
            let initials = client.full_name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
            let colorIndex = abs(client.full_name.hashValue) % avatarColors.count

            RoundedRectangle(cornerRadius: 11)
                .fill(avatarColors[colorIndex])
                .frame(width: 40, height: 40)
                .overlay(
                    Text(initials)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .tracking(-0.5)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(client.full_name)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis)
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                        .lineLimit(1)
                }

                if let phone = client.phone, !phone.isEmpty {
                    Text(phone)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13))
                .foregroundColor(.palmBorder)
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }
}

#Preview {
    ClientsView()
        .environmentObject(APIService.shared)
}
