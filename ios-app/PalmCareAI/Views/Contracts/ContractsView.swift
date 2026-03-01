import SwiftUI

struct ContractsView: View {
    @EnvironmentObject var api: APIService

    @State private var documents: [DocumentItem] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedFilter = "All"

    private let filters = ["All", "contract", "note", "transcript"]

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
        .navigationTitle("Contracts & Documents")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDocuments() }
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
                    DocumentRow(document: doc, api: api)
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
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Document Row

struct DocumentRow: View {
    let document: DocumentItem
    let api: APIService

    private var iconName: String {
        switch document.type?.lowercased() {
        case "contract": return "doc.text.fill"
        case "note": return "note.text"
        case "transcript": return "waveform"
        default: return "doc.fill"
        }
    }

    private var iconColor: Color {
        switch document.type?.lowercased() {
        case "contract": return .palmPrimary
        case "note": return .palmBlue
        case "transcript": return .palmPurple
        default: return .palmSecondary
        }
    }

    private var formattedSize: String {
        guard let bytes = document.size else { return "" }
        if bytes > 1_000_000 {
            return String(format: "%.1f MB", Double(bytes) / 1_000_000)
        } else if bytes > 1_000 {
            return String(format: "%.0f KB", Double(bytes) / 1_000)
        }
        return "\(bytes) B"
    }

    private var formattedDate: String {
        guard let dateStr = document.created_at, let date = ISO8601Flexible.parse(dateStr) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f.string(from: date)
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(iconColor)
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

                if let type = document.type {
                    Text(type.capitalized)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(iconColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(iconColor.opacity(0.08))
                        .cornerRadius(4)
                }
            }

            Spacer()

            if !formattedSize.isEmpty {
                Text(formattedSize)
                    .font(.system(size: 10))
                    .foregroundColor(.palmSecondary)
            }

            if let url = document.download_url, let downloadURL = URL(string: url) {
                Link(destination: downloadURL) {
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.palmPrimary)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }
}
