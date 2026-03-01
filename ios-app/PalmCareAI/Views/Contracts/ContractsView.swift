import SwiftUI
import QuickLook

struct ContractsView: View {
    @EnvironmentObject var api: APIService

    @State private var documents: [DocumentItem] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedFilter = "All"
    @State private var previewURL: URL?
    @State private var downloadingId: String?
    @State private var errorMessage: String?

    private let filters = ["All", "contract", "note", "audio"]

    var filteredDocuments: [DocumentItem] {
        var result = documents
        if selectedFilter != "All" {
            result = result.filter { ($0.type ?? "").lowercased() == selectedFilter.lowercased() }
        }
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
                || ($0.client_name ?? "").localizedCaseInsensitiveContains(searchText)
            }
        }
        return result
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar
            searchBar

            if let msg = errorMessage {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 11))
                    Text(msg)
                        .font(.system(size: 12))
                }
                .foregroundColor(.red)
                .padding(.horizontal, 18)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red.opacity(0.06))
                .onTapGesture { errorMessage = nil }
            }

            Group {
                if isLoading {
                    VStack { Spacer(); ProgressView("Loading documents..."); Spacer() }
                } else if filteredDocuments.isEmpty {
                    emptyState
                } else {
                    documentList
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
                    Button { withAnimation { selectedFilter = filter } } label: {
                        Text(filter.capitalized)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(selectedFilter == filter ? .white : .palmSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(
                                selectedFilter == filter
                                    ? Color.palmPrimary
                                    : Color.white
                            )
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
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
            TextField("Search documents...", text: $searchText)
                .font(.system(size: 13))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(Color.palmFieldBg)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
        .padding(.horizontal, 18)
        .padding(.vertical, 8)
    }

    // MARK: - Document List

    private var documentList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 8) {
                ForEach(filteredDocuments) { doc in
                    DocumentRow(
                        document: doc,
                        isDownloading: downloadingId == doc.id,
                        onTap: { await downloadAndPreview(doc) }
                    )
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 4)
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

    // MARK: - Load

    private func loadDocuments() async {
        do {
            let response = try await api.fetchDocuments()
            await MainActor.run {
                documents = response.documents
                isLoading = false
            }
        } catch {
            print("[ContractsView] Failed to load documents: \(error)")
            await MainActor.run {
                errorMessage = "Failed to load documents"
                isLoading = false
            }
        }
    }

    // MARK: - Download & Preview

    private func downloadAndPreview(_ doc: DocumentItem) async {
        guard let path = doc.download_url, !path.isEmpty else {
            await MainActor.run { errorMessage = "No download link available for this document" }
            return
        }

        await MainActor.run {
            downloadingId = doc.id
            errorMessage = nil
        }

        do {
            let localURL = try await api.downloadFile(path: path, suggestedFilename: doc.name)
            await MainActor.run {
                downloadingId = nil
                previewURL = localURL
            }
        } catch {
            await MainActor.run {
                downloadingId = nil
                errorMessage = "Download failed: \(error.localizedDescription)"
            }
        }
    }
}

// MARK: - Document Row

struct DocumentRow: View {
    let document: DocumentItem
    let isDownloading: Bool
    let onTap: () async -> Void

    private var iconName: String {
        switch document.type?.lowercased() {
        case "contract": return "doc.text.fill"
        case "note": return "note.text"
        case "audio": return "waveform"
        case "transcript": return "waveform"
        default: return "doc.fill"
        }
    }

    private var iconColor: Color {
        switch document.type?.lowercased() {
        case "contract": return .palmPrimary
        case "note": return .blue
        case "audio": return .purple
        case "transcript": return .purple
        default: return .palmSecondary
        }
    }

    private var formattedSize: String {
        guard let s = document.size, s != "-" else { return "" }
        return s
    }

    private var formattedDate: String {
        guard let dateStr = document.created_at, let date = ISO8601Flexible.parse(dateStr) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f.string(from: date)
    }

    var body: some View {
        Button {
            Task { await onTap() }
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Image(systemName: iconName)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(iconColor)
                }
                .frame(width: 40, height: 40)
                .background(iconColor.opacity(0.1))
                .cornerRadius(10)

                VStack(alignment: .leading, spacing: 3) {
                    Text(document.name)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        if let client = document.client_name, !client.isEmpty {
                            Text(client)
                                .font(.system(size: 11))
                                .foregroundColor(.palmSecondary)
                        }
                        if !formattedDate.isEmpty {
                            Text("·").foregroundColor(.palmBorder)
                            Text(formattedDate)
                                .font(.system(size: 11))
                                .foregroundColor(.palmSecondary)
                        }
                    }

                    HStack(spacing: 6) {
                        if let type = document.type {
                            Text(type.capitalized)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(iconColor)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(iconColor.opacity(0.08))
                                .cornerRadius(4)
                        }
                        if let fmt = document.format {
                            Text(fmt.uppercased())
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.palmSecondary)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color.palmFieldBg)
                                .cornerRadius(3)
                        }
                    }
                }

                Spacer()

                if !formattedSize.isEmpty {
                    Text(formattedSize)
                        .font(.system(size: 10))
                        .foregroundColor(.palmSecondary)
                }

                if isDownloading {
                    ProgressView()
                        .frame(width: 24, height: 24)
                } else {
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.palmPrimary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(isDownloading)
        .opacity(isDownloading ? 0.7 : 1)
    }
}
