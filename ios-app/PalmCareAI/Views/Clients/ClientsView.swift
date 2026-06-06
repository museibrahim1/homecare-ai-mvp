import SwiftUI

// MARK: - Shared Avatar (reused by Clients list + Client picker)

/// Circular gradient avatar showing a client's initials. The gradient is
/// derived from the name so each client gets a stable, distinct color.
struct ClientAvatar: View {
    let name: String
    var size: CGFloat = 46

    private static let palettes: [[Color]] = [
        [Color(red: 13/255, green: 148/255, blue: 136/255), Color(red: 6/255, green: 95/255, blue: 70/255)],
        [Color(red: 59/255, green: 130/255, blue: 246/255), Color(red: 37/255, green: 99/255, blue: 235/255)],
        [Color(red: 168/255, green: 85/255, blue: 247/255), Color(red: 124/255, green: 58/255, blue: 237/255)],
        [Color(red: 236/255, green: 72/255, blue: 153/255), Color(red: 219/255, green: 39/255, blue: 119/255)],
        [Color(red: 245/255, green: 158/255, blue: 11/255), Color(red: 217/255, green: 119/255, blue: 6/255)],
        [Color(red: 6/255, green: 182/255, blue: 212/255), Color(red: 8/255, green: 145/255, blue: 178/255)],
    ]

    private var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        let result = parts.map { String($0.prefix(1)) }.joined().uppercased()
        return result.isEmpty ? "?" : result
    }

    private var palette: [Color] {
        Self.palettes[abs(name.hashValue) % Self.palettes.count]
    }

    var body: some View {
        Circle()
            .fill(
                LinearGradient(colors: palette, startPoint: .topLeading, endPoint: .bottomTrailing)
            )
            .frame(width: size, height: size)
            .overlay(
                Text(initials)
                    .font(.system(size: size * 0.38, weight: .bold))
                    .foregroundColor(.white)
            )
            .shadow(color: palette[0].opacity(0.35), radius: 4, y: 2)
    }
}

// MARK: - Clients Page

struct ClientsView: View {
    @EnvironmentObject var api: APIService

    @State private var clients: [Client] = []
    @State private var searchText = ""
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var showAddClient = false

    var filteredClients: [Client] {
        if searchText.isEmpty { return clients }
        return clients.filter {
            $0.full_name.localizedCaseInsensitiveContains(searchText)
                || ($0.phone?.contains(searchText) ?? false)
                || ($0.primary_diagnosis?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    private var activeCount: Int {
        clients.filter { ($0.status ?? "active").lowercased() == "active" }.count
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            Group {
                if isLoading {
                    loadingView
                } else if loadError != nil {
                    errorView
                } else if clients.isEmpty {
                    emptyView
                } else {
                    clientList
                }
            }
        }
        .background(Color.palmBackground.ignoresSafeArea())
        .refreshable { await loadClients() }
        .task { await loadClients() }
        .sheet(isPresented: $showAddClient) {
            AddClientSheet(onClientCreated: { newClient in
                clients.insert(newClient, at: 0)
            })
            .environmentObject(api)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Clients")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(.palmText)
                        .tracking(-0.6)

                    if !clients.isEmpty {
                        Text("\(clients.count) total · \(activeCount) active")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                }

                Spacer()

                Button { showAddClient = true } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(
                            LinearGradient(
                                colors: [Color.palmPrimary, Color.palmTeal600],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(Circle())
                        .shadow(color: Color.palmPrimary.opacity(0.4), radius: 6, y: 3)
                }
                .accessibilityLabel("Add new client")
            }

            HStack(spacing: 9) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmSecondary)

                TextField("Search name, phone, or diagnosis", text: $searchText)
                    .font(.system(size: 15))
                    .foregroundColor(.palmText)
                    .autocorrectionDisabled()
                    .accessibilityLabel("Search clients")

                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 15))
                            .foregroundColor(.palmSecondary.opacity(0.6))
                    }
                    .accessibilityLabel("Clear search")
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(Color.palmFieldBg)
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
        .padding(.horizontal, 18)
        .padding(.top, 10)
        .padding(.bottom, 14)
    }

    // MARK: - List

    private var clientList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 10) {
                ForEach(filteredClients) { client in
                    NavigationLink(destination: ClientDetailView(client: client).environmentObject(api)) {
                        ClientCard(client: client)
                    }
                    .accessibilityLabel("View \(client.full_name)")
                    .buttonStyle(.plain)
                }

                if filteredClients.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 34))
                            .foregroundColor(.palmSecondary.opacity(0.4))
                        Text("No results for \u{201C}\(searchText)\u{201D}")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
            .padding(.bottom, 110)
        }
    }

    // MARK: - States

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .tint(.palmPrimary)
            Text("Loading clients\u{2026}")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .padding(.top, 10)
            Spacer()
        }
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Spacer()
            ZStack {
                Circle()
                    .fill(Color.palmPrimary.opacity(0.08))
                    .frame(width: 96, height: 96)
                Image(systemName: "person.2.fill")
                    .font(.system(size: 38))
                    .foregroundColor(.palmPrimary.opacity(0.7))
            }
            Text("No clients yet")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.palmText)
            Text("Add your first client to start recording assessments and generating contracts.")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)

            Button { showAddClient = true } label: {
                HStack(spacing: 7) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                    Text("Add Client")
                        .font(.system(size: 15, weight: .bold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 13)
                .background(
                    LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                   startPoint: .leading, endPoint: .trailing)
                )
                .cornerRadius(14)
                .shadow(color: Color.palmPrimary.opacity(0.35), radius: 8, y: 4)
            }
            .padding(.top, 6)
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 40)
    }

    private var errorView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 38))
                .foregroundColor(.palmOrange)
            Text("Something went wrong")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.palmText)
            Text(loadError ?? "")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
            Button {
                loadError = nil
                Task { await loadClients() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 13, weight: .bold))
                    Text("Try Again")
                        .font(.system(size: 15, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 22)
                .padding(.vertical, 11)
                .background(Color.palmPrimary)
                .cornerRadius(12)
            }
            .padding(.top, 4)
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 40)
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
                loadError = error.localizedDescription
                isLoading = false
            }
        }
    }
}

// MARK: - Client Card

struct ClientCard: View {
    let client: Client

    private var statusLabel: String {
        (client.status ?? "active").capitalized
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
        HStack(spacing: 13) {
            ClientAvatar(name: client.full_name, size: 48)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 7) {
                    Text(client.full_name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)

                    if let careLevel = client.care_level, !careLevel.isEmpty {
                        Text(careLevel.capitalized)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.palmPink)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.palmPink.opacity(0.12))
                            .cornerRadius(5)
                    }
                }

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.system(size: 12.5))
                        .foregroundColor(.palmSecondary)
                        .lineLimit(1)
                }

                HStack(spacing: 10) {
                    HStack(spacing: 4) {
                        Circle().fill(statusColor).frame(width: 6, height: 6)
                        Text(statusLabel)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(statusColor)
                    }
                    if let phone = client.phone, !phone.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 9))
                            Text(phone)
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(.palmSecondary)
                    }
                    if let city = client.city, !city.isEmpty {
                        HStack(spacing: 3) {
                            Image(systemName: "mappin")
                                .font(.system(size: 9))
                            Text(city)
                                .font(.system(size: 11))
                        }
                        .foregroundColor(.palmSecondary)
                    }
                }
            }

            Spacer(minLength: 4)

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmSecondary.opacity(0.4))
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder.opacity(0.7), lineWidth: 1))
        .shadow(color: .black.opacity(0.03), radius: 5, y: 2)
    }
}

#Preview {
    ClientsView()
        .environmentObject(APIService.shared)
}
