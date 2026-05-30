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

    private var allClients: [Client] {
        localClients.isEmpty ? clients : localClients
    }

    var filtered: [Client] {
        if search.isEmpty { return allClients }
        return allClients.filter { $0.full_name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            List {
                Button { showAddClient = true } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.palmPrimary)
                        Text("Add New Client")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                        Spacer()
                    }
                }

                ForEach(filtered) { client in
                    Button {
                        selected = client
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(client.full_name)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundColor(.palmText)
                                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                                    Text(diagnosis).font(.caption).foregroundColor(.palmSecondary)
                                }
                                if let phone = client.phone {
                                    Text(phone).font(.caption).foregroundColor(.palmSecondary)
                                }
                            }
                            Spacer()
                            if selected?.id == client.id {
                                Image(systemName: "checkmark.circle.fill").foregroundColor(.palmPrimary)
                            }
                        }
                    }
                }
            }
            .searchable(text: $search, prompt: "Search clients")
            .navigationTitle("Select Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showAddClient) {
                AddClientSheet(onClientCreated: { newClient in
                    selected = newClient
                    onClientAdded?(newClient)
                    dismiss()
                })
                .environmentObject(api)
            }
            .task {
                if clients.isEmpty {
                    do {
                        localClients = try await api.fetchClients()
                    } catch {
                        // Clients already passed in; fallback silently
                    }
                }
            }
        }
    }
}
