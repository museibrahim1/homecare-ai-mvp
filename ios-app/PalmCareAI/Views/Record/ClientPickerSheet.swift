import SwiftUI

// MARK: - Client Picker Sheet

struct ClientPickerSheet: View {
    @EnvironmentObject var api: APIService
    let clients: [Client]
    @Binding var selected: Client?
    var onClientAdded: ((Client) -> Void)?
    @Environment(\.dismiss) private var dismiss

    @State private var search = ""
    @State private var showAddClient = false
    @State private var localClients: [Client] = []
    @State private var loadFailed = false

    private var allClients: [Client] {
        localClients.isEmpty ? clients : localClients
    }

    var filtered: [Client] {
        if search.isEmpty { return allClients }
        return allClients.filter {
            $0.full_name.localizedCaseInsensitiveContains(search)
                || ($0.primary_diagnosis?.localizedCaseInsensitiveContains(search) ?? false)
                || ($0.phone?.contains(search) ?? false)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            grabber
            header
            searchBar
            addClientButton

            if filtered.isEmpty {
                emptyState
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        ForEach(filtered) { client in
                            clientRow(client)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 30)
                }
            }
        }
        .background(Color.palmBackground.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
        .sheet(isPresented: $showAddClient) {
            AddClientSheet(onClientCreated: { newClient in
                selected = newClient
                onClientAdded?(newClient)
                dismiss()
            })
            .environmentObject(api)
        }
        .task { await loadClientsIfNeeded() }
    }

    private func loadClientsIfNeeded() async {
        guard clients.isEmpty else { return }
        do {
            localClients = try await api.fetchClients()
            loadFailed = false
        } catch {
            loadFailed = true
        }
    }

    // MARK: - Pieces

    private var grabber: some View {
        Capsule()
            .fill(Color.palmSecondary.opacity(0.3))
            .frame(width: 38, height: 5)
            .padding(.top, 8)
            .padding(.bottom, 4)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Select Client")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundColor(.palmText)
                    .tracking(-0.4)
                Text("Who is this assessment for?")
                    .font(.system(size: 12.5))
                    .foregroundColor(.palmSecondary)
            }
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
        .padding(.top, 6)
        .padding(.bottom, 12)
    }

    private var searchBar: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmSecondary)
            TextField("Search clients", text: $search)
                .font(.system(size: 15))
                .foregroundColor(.palmText)
                .autocorrectionDisabled()
            if !search.isEmpty {
                Button { search = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.palmSecondary.opacity(0.6))
                }
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 10)
        .background(Color.palmFieldBg)
        .cornerRadius(11)
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color.palmBorder, lineWidth: 1))
        .padding(.horizontal, 18)
        .padding(.bottom, 12)
    }

    private var addClientButton: some View {
        Button { showAddClient = true } label: {
            HStack(spacing: 11) {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 38, height: 38)
                    .background(
                        LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .clipShape(Circle())
                Text("Add New Client")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.palmPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmPrimary.opacity(0.5))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(Color.palmPrimary.opacity(0.06))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14)
                .stroke(Color.palmPrimary.opacity(0.25), style: StrokeStyle(lineWidth: 1, dash: [5, 4])))
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 14)
        .accessibilityLabel("Add new client")
    }

    private func clientRow(_ client: Client) -> some View {
        let isSelected = selected?.id == client.id
        return Button {
            selected = client
            dismiss()
        } label: {
            HStack(spacing: 12) {
                ClientAvatar(name: client.full_name, size: 42)

                VStack(alignment: .leading, spacing: 2) {
                    Text(client.full_name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)
                    HStack(spacing: 6) {
                        if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                            Text(diagnosis.replacingOccurrences(of: "_", with: " ").capitalized)
                                .lineLimit(1)
                        } else if let phone = client.phone, !phone.isEmpty {
                            Text(phone)
                        }
                    }
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundColor(isSelected ? .palmPrimary : .palmBorder)
            }
            .padding(.horizontal, 13)
            .padding(.vertical, 10)
            .background(isSelected ? Color.palmPrimary.opacity(0.07) : Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14)
                .stroke(isSelected ? Color.palmPrimary.opacity(0.4) : Color.palmBorder.opacity(0.7), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(client.full_name)\(isSelected ? ", selected" : "")")
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            if loadFailed && search.isEmpty {
                Image(systemName: "wifi.exclamationmark")
                    .font(.system(size: 36))
                    .foregroundColor(.palmOrange)
                Text("Couldn't load clients")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmText)
                Button {
                    Task { await loadClientsIfNeeded() }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 12, weight: .bold))
                        Text("Try Again")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 9)
                    .background(Color.palmPrimary)
                    .cornerRadius(10)
                }
            } else {
                Image(systemName: search.isEmpty ? "person.2.slash" : "magnifyingglass")
                    .font(.system(size: 36))
                    .foregroundColor(.palmSecondary.opacity(0.4))
                Text(search.isEmpty ? "No clients yet" : "No results for \u{201C}\(search)\u{201D}")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmText)
                if search.isEmpty {
                    Text("Add a client above to get started.")
                        .font(.system(size: 13))
                        .foregroundColor(.palmSecondary)
                }
            }
            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 40)
    }
}
