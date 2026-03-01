import SwiftUI
import QuickLook

// MARK: - Client group model (local, not Codable)

private struct ClientGroup: Identifiable {
    let id: String          // client_id or "unknown"
    let name: String
    let contracts: [DocumentItem]
    let notes: [DocumentItem]
    let audio: [DocumentItem]

    var totalCount: Int { contracts.count + notes.count + audio.count }
}

struct ContractsView: View {
    @EnvironmentObject var api: APIService

    @State private var documents: [DocumentItem] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedFilter = "All"
    @State private var previewURL: URL?
    @State private var downloadingId: String?
    @State private var errorMessage: String?
    @State private var expandedClients: Set<String> = []

    private let filters = ["All", "contract", "note", "audio"]

    // Group documents by client
    private var clientGroups: [ClientGroup] {
        let filtered: [DocumentItem]
        if selectedFilter == "All" {
            filtered = documents
        } else {
            filtered = documents.filter { ($0.type ?? "").lowercased() == selectedFilter.lowercased() }
        }

        let searched: [DocumentItem]
        if searchText.isEmpty {
            searched = filtered
        } else {
            let q = searchText.lowercased()
            searched = filtered.filter {
                $0.name.lowercased().contains(q)
                || ($0.client_name ?? "").lowercased().contains(q)
            }
        }

        var grouped: [String: (name: String, docs: [DocumentItem])] = [:]
        for doc in searched {
            let key = doc.client_id ?? "unknown"
            let name = doc.client_name ?? "Unknown Client"
            if grouped[key] == nil {
                grouped[key] = (name: name, docs: [])
            }
            grouped[key]!.docs.append(doc)
        }

        return grouped.map { key, val in
            ClientGroup(
                id: key,
                name: val.name,
                contracts: val.docs.filter { ($0.type ?? "").lowercased() == "contract" },
                notes: val.docs.filter { ($0.type ?? "").lowercased() == "note" },
                audio: val.docs.filter { ($0.type ?? "").lowercased() == "audio" }
            )
        }
        .sorted { $0.name.lowercased() < $1.name.lowercased() }
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar
            searchBar

            if let msg = errorMessage {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 11))
                    Text(msg).font(.system(size: 12))
                    Spacer()
                    Button { errorMessage = nil } label: {
                        Image(systemName: "xmark").font(.system(size: 10, weight: .bold))
                    }
                }
                .foregroundColor(.red)
                .padding(.horizontal, 18).padding(.vertical, 6)
                .background(Color.red.opacity(0.06))
            }

            Group {
                if isLoading {
                    VStack { Spacer(); ProgressView("Loading documents..."); Spacer() }
                } else if clientGroups.isEmpty {
                    emptyState
                } else {
                    groupedList
                }
            }
        }
        .background(Color.palmBackground)
        .task { await loadDocuments() }
        .quickLookPreview($previewURL)
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filters, id: \.self) { filter in
                    Button { withAnimation(.easeInOut(duration: 0.2)) { selectedFilter = filter } } label: {
                        Text(filter.capitalized)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(selectedFilter == filter ? .white : .palmSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(selectedFilter == filter ? Color.palmPrimary : Color.white)
                            .cornerRadius(18)
                            .overlay(
                                RoundedRectangle(cornerRadius: 18)
                                    .stroke(selectedFilter == filter ? Color.clear : Color.palmBorder, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
        }
        .background(Color.white)
    }

    // MARK: - Search

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").font(.system(size: 14)).foregroundColor(.palmSecondary)
            TextField("Search by client or document...", text: $searchText).font(.system(size: 13))
            if !searchText.isEmpty {
                Button { searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 14)).foregroundColor(.palmSecondary)
                }
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 9)
        .background(Color.palmFieldBg)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
        .padding(.horizontal, 18).padding(.vertical, 8)
    }

    // MARK: - Grouped List

    private var groupedList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 12) {
                ForEach(clientGroups) { group in
                    ClientSection(
                        group: group,
                        isExpanded: expandedClients.contains(group.id),
                        downloadingId: downloadingId,
                        onToggle: { toggleClient(group.id) },
                        onDocTap: { doc in await downloadAndPreview(doc) }
                    )
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 6)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 44))
                .foregroundColor(.palmSecondary.opacity(0.4))
            Text("No Documents Found")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Contracts and documents from completed assessments will appear here.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    // MARK: - Actions

    private func toggleClient(_ id: String) {
        withAnimation(.easeInOut(duration: 0.25)) {
            if expandedClients.contains(id) {
                expandedClients.remove(id)
            } else {
                expandedClients.insert(id)
            }
        }
    }

    private func loadDocuments() async {
        do {
            let response = try await api.fetchDocuments()
            await MainActor.run {
                documents = response.documents
                // Auto-expand all clients on first load
                let ids = Set(response.documents.compactMap { $0.client_id ?? "unknown" })
                expandedClients = ids
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load documents"
                isLoading = false
            }
        }
    }

    private func downloadAndPreview(_ doc: DocumentItem) async {
        guard let path = doc.download_url, !path.isEmpty else {
            await MainActor.run { errorMessage = "No download link for this document" }
            return
        }
        await MainActor.run { downloadingId = doc.id; errorMessage = nil }
        do {
            let localURL = try await api.downloadFile(path: path, suggestedFilename: doc.name)
            await MainActor.run { downloadingId = nil; previewURL = localURL }
        } catch {
            await MainActor.run { downloadingId = nil; errorMessage = "Download failed: \(error.localizedDescription)" }
        }
    }
}

// MARK: - Client Section (collapsible card)

private struct ClientSection: View {
    let group: ClientGroup
    let isExpanded: Bool
    let downloadingId: String?
    let onToggle: () -> Void
    let onDocTap: (DocumentItem) async -> Void

    private static let avatarColors: [Color] = [
        Color(red: 13/255, green: 148/255, blue: 136/255),
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 124/255, green: 58/255, blue: 237/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
        Color(red: 8/255, green: 145/255, blue: 178/255),
        Color(red: 220/255, green: 38/255, blue: 38/255),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Client header
            Button(action: onToggle) {
                HStack(spacing: 11) {
                    let initials = group.name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
                    let colorIdx = abs(group.name.hashValue) % Self.avatarColors.count

                    RoundedRectangle(cornerRadius: 10)
                        .fill(Self.avatarColors[colorIdx])
                        .frame(width: 38, height: 38)
                        .overlay(
                            Text(initials.prefix(2))
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white)
                        )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(group.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.palmText)
                            .lineLimit(1)

                        HStack(spacing: 8) {
                            if !group.contracts.isEmpty {
                                Label("\(group.contracts.count)", systemImage: "doc.text.fill")
                            }
                            if !group.notes.isEmpty {
                                Label("\(group.notes.count)", systemImage: "note.text")
                            }
                            if !group.audio.isEmpty {
                                Label("\(group.audio.count)", systemImage: "waveform")
                            }
                        }
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.palmSecondary)
                    }

                    Spacer()

                    Text("\(group.totalCount)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.palmSecondary)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Color.palmFieldBg)
                        .cornerRadius(6)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.palmBorder)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                Divider().padding(.horizontal, 14)

                VStack(spacing: 0) {
                    if !group.contracts.isEmpty {
                        docSection(title: "Contracts", icon: "doc.text.fill", color: .palmPrimary, docs: group.contracts)
                    }
                    if !group.notes.isEmpty {
                        docSection(title: "Assessment Notes", icon: "note.text", color: .blue, docs: group.notes)
                    }
                    if !group.audio.isEmpty {
                        docSection(title: "Audio Recordings", icon: "waveform", color: .purple, docs: group.audio)
                    }
                }
                .padding(.bottom, 8)
            }
        }
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }

    private func docSection(title: String, icon: String, color: Color, docs: [DocumentItem]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(color)
                Text(title)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(color)
            }
            .padding(.horizontal, 14)
            .padding(.top, 10)
            .padding(.bottom, 4)

            ForEach(docs) { doc in
                CompactDocRow(
                    document: doc,
                    color: color,
                    isDownloading: downloadingId == doc.id,
                    onTap: { await onDocTap(doc) }
                )
            }
        }
    }
}

// MARK: - Compact Document Row (inside client card)

private struct CompactDocRow: View {
    let document: DocumentItem
    let color: Color
    let isDownloading: Bool
    let onTap: () async -> Void

    private var formattedDate: String {
        guard let s = document.created_at, let d = ISO8601Flexible.parse(s) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: d)
    }

    var body: some View {
        Button { Task { await onTap() } } label: {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(color.opacity(0.6))
                    .frame(width: 3, height: 28)

                VStack(alignment: .leading, spacing: 1) {
                    Text(document.name)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmText)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        if let fmt = document.format {
                            Text(fmt.uppercased())
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.palmSecondary)
                        }
                        if !formattedDate.isEmpty {
                            Text(formattedDate)
                                .font(.system(size: 9))
                                .foregroundColor(.palmSecondary)
                        }
                        if let s = document.size, s != "-", !s.isEmpty {
                            Text(s)
                                .font(.system(size: 9))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                }

                Spacer()

                if isDownloading {
                    ProgressView().controlSize(.small)
                } else {
                    Image(systemName: "arrow.down.circle")
                        .font(.system(size: 16))
                        .foregroundColor(color.opacity(0.7))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
        }
        .buttonStyle(.plain)
        .disabled(isDownloading)
        .opacity(isDownloading ? 0.6 : 1)
    }
}
