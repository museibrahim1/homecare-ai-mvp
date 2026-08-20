import SwiftUI
import QuickLook

// MARK: - Client group model (local, not Codable)

private struct ClientGroup: Identifiable {
    let id: String          // client_id or "unknown"
    let name: String
    let contracts: [DocumentItem]
    let carePlans: [DocumentItem]
    let notes: [DocumentItem]
    let audio: [DocumentItem]

    var totalCount: Int { contracts.count + carePlans.count + notes.count + audio.count }

    /// All documents in the group, newest first.
    var allDocs: [DocumentItem] {
        (contracts + carePlans + notes + audio)
            .sorted { ContractsDate.parse($0.created_at) ?? .distantPast > ContractsDate.parse($1.created_at) ?? .distantPast }
    }

    /// Newest document timestamp in the group (drives assessment date + sort).
    var latestDate: Date? {
        allDocs.compactMap { ContractsDate.parse($0.created_at) }.max()
    }

    /// Best visit to open when tapping a packet that has no file of its own
    /// (e.g. Billables). Prefer the contract's visit, then care plan, then note.
    var representativeVisitId: String? {
        (contracts + carePlans + notes)
            .compactMap { $0.visit_id }
            .first { !$0.isEmpty }
    }
}

// MARK: - Date parsing helper

private enum ContractsDate {
    static func parse(_ s: String?) -> Date? {
        guard let s = s else { return nil }
        return ISO8601Flexible.parse(s)
    }
}

// MARK: - Packet (Paper "Documents" packet cards)

private enum PacketKind: String, CaseIterable, Identifiable {
    case carePlan, billables, notes, contract
    var id: String { rawValue }

    var title: String {
        switch self {
        case .carePlan:  return "Care Plan"
        case .billables: return "Billables"
        case .notes:     return "Visit Notes"
        case .contract:  return "Contract"
        }
    }

    var icon: String {
        switch self {
        case .carePlan:  return "list.clipboard.fill"
        case .billables: return "dollarsign.circle.fill"
        case .notes:     return "note.text"
        case .contract:  return "doc.text.fill"
        }
    }

    var accent: Color {
        switch self {
        case .carePlan:  return .palmPrimary
        case .billables: return .palmGreen
        case .notes:     return .palmBlue
        case .contract:  return .palmTeal600
        }
    }

    /// Index into `VisitDetailView.fullTabs` for deep-linking.
    var tabIndex: Int {
        switch self {
        case .billables: return 2
        case .notes:     return 3
        case .carePlan:  return 4
        case .contract:  return 5
        }
    }

    /// DocumentItem.type this packet maps to. Billables has no file output.
    var docType: String? {
        switch self {
        case .carePlan:  return "care_plan"
        case .billables: return nil
        case .notes:     return "note"
        case .contract:  return "contract"
        }
    }
}

private struct ResolvedPacket: Identifiable {
    let kind: PacketKind
    let doc: DocumentItem?
    let visitId: String?
    let subtitle: String
    var id: String { kind.id }
    var isReady: Bool { doc != nil || (kind == .billables && (visitId?.isEmpty == false)) }
}

// MARK: - Deep-link target

private struct VisitPushTarget: Identifiable {
    let id = UUID()
    let visitId: String
    let clientName: String
    let tab: Int
}

struct ContractsView: View {
    @EnvironmentObject var api: APIService

    /// Reports the "documents ready" count up to WorkspaceView for the nav subtitle.
    var onCountChange: ((Int) -> Void)? = nil

    @State private var documents: [DocumentItem] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedFilter = "All"
    @State private var previewURL: URL?
    @State private var downloadingId: String?
    @State private var errorMessage: String?
    @State private var loadFailed = false
    @State private var expandedClients: Set<String> = []
    @State private var selectedClientId: String?
    @State private var showBrowseAll = false
    @State private var pushTarget: VisitPushTarget?

    private let filters = ["All", "Contract", "Care Plan", "Note", "Audio"]

    private func documentTypeKey(_ filter: String) -> String? {
        switch filter {
        case "All": return nil
        case "Care Plan": return "care_plan"
        default: return filter.lowercased()
        }
    }

    private func filterLabel(_ filter: String) -> String {
        switch filter {
        case "All": return "All"
        case "Care Plan": return "Care Plans"
        default: return "\(filter)s"
        }
    }

    // MARK: - Grouping

    private func groups(from docs: [DocumentItem]) -> [ClientGroup] {
        var grouped: [String: (name: String, docs: [DocumentItem])] = [:]
        for doc in docs {
            let key = doc.client_id ?? "unknown"
            let name = doc.client_name ?? "Unknown Client"
            if grouped[key] == nil { grouped[key] = (name: name, docs: []) }
            grouped[key, default: (name: name, docs: [])].docs.append(doc)
        }
        return grouped.map { key, val in
            ClientGroup(
                id: key,
                name: val.name,
                contracts: val.docs.filter { ($0.type ?? "").lowercased() == "contract" },
                carePlans: val.docs.filter { ($0.type ?? "").lowercased() == "care_plan" },
                notes: val.docs.filter { ($0.type ?? "").lowercased() == "note" },
                audio: val.docs.filter { ($0.type ?? "").lowercased() == "audio" }
            )
        }
    }

    /// All clients with documents, most recently active first (drives the packet).
    private var allGroups: [ClientGroup] {
        groups(from: documents).sorted {
            ($0.latestDate ?? .distantPast) > ($1.latestDate ?? .distantPast)
        }
    }

    /// Filtered + searched groups for the "Browse all" secondary list.
    private var browseGroups: [ClientGroup] {
        let filtered: [DocumentItem]
        if let typeKey = documentTypeKey(selectedFilter) {
            filtered = documents.filter { ($0.type ?? "").lowercased() == typeKey }
        } else {
            filtered = documents
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
        return groups(from: searched).sorted { $0.name.lowercased() < $1.name.lowercased() }
    }

    private var selectedGroup: ClientGroup? {
        if let id = selectedClientId, let match = allGroups.first(where: { $0.id == id }) {
            return match
        }
        return allGroups.first
    }

    private var readyCount: Int { documents.count }

    // MARK: - Packet resolution

    private func mostRecent(_ docs: [DocumentItem]) -> DocumentItem? {
        docs.max { (ContractsDate.parse($0.created_at) ?? .distantPast) < (ContractsDate.parse($1.created_at) ?? .distantPast) }
    }

    private func resolvedPackets(for group: ClientGroup) -> [ResolvedPacket] {
        PacketKind.allCases.map { kind in
            let doc: DocumentItem?
            switch kind {
            case .carePlan:  doc = mostRecent(group.carePlans)
            case .notes:     doc = mostRecent(group.notes)
            case .contract:  doc = mostRecent(group.contracts)
            case .billables: doc = nil
            }
            let visitId = (doc?.visit_id?.isEmpty == false ? doc?.visit_id : nil) ?? group.representativeVisitId
            return ResolvedPacket(
                kind: kind,
                doc: doc,
                visitId: visitId,
                subtitle: subtitle(for: kind, doc: doc)
            )
        }
    }

    private func subtitle(for kind: PacketKind, doc: DocumentItem?) -> String {
        switch kind {
        case .carePlan:  return "SOAP care plan"
        case .billables: return "Weekly services"
        case .notes:     return "Clinical narrative"
        case .contract:
            if let name = doc?.name, let state = Self.stateName(in: name) {
                return "Service agreement · \(state)"
            }
            return "Service agreement"
        }
    }

    /// Best-effort US state pulled from a contract file name (honest, no invention).
    private static let stateCodes: Set<String> = [
        "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
        "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
        "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
        "VA","WA","WV","WI","WY","DC"
    ]

    private static func stateName(in text: String) -> String? {
        let tokens = text.uppercased().components(separatedBy: CharacterSet.alphanumerics.inverted)
        return tokens.first { stateCodes.contains($0) }
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            errorBanner

            Group {
                if isLoading {
                    loadingState
                } else if loadFailed && documents.isEmpty {
                    loadFailedState
                } else if allGroups.isEmpty {
                    emptyState
                } else {
                    packetScroll
                }
            }
        }
        .palmGlassScreen()
        .task { await loadDocuments() }
        .quickLookPreview($previewURL)
        .navigationDestination(isPresented: pushBinding) {
            if let t = pushTarget {
                VisitDetailView(visitId: t.visitId, clientName: t.clientName, initialTab: t.tab)
                    .environmentObject(api)
            }
        }
    }

    private var pushBinding: Binding<Bool> {
        Binding(
            get: { pushTarget != nil },
            set: { if !$0 { pushTarget = nil } }
        )
    }

    // MARK: - Primary packet scroll

    private var packetScroll: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                headerRow

                if let group = selectedGroup {
                    assessmentContextRow(group)

                    VStack(spacing: 12) {
                        ForEach(resolvedPackets(for: group)) { packet in
                            PacketCard(
                                packet: packet,
                                isDownloading: packet.doc.map { downloadingId == $0.id } ?? false,
                                onTap: { handleTap(packet, group: group) }
                            )
                        }
                    }
                }

                browseAllSection
            }
            .padding(.horizontal, 18)
            .padding(.top, 10)
            .padding(.bottom, 120)
        }
        .refreshable { await loadDocuments() }
    }

    // MARK: - Header (count + export)

    private var headerRow: some View {
        HStack(alignment: .center) {
            Text("\(readyCount) document\(readyCount == 1 ? "" : "s") ready")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.palmSecondary)

            Spacer()

            exportButton
        }
    }

    private var contractDoc: DocumentItem? {
        guard let group = selectedGroup else { return nil }
        return mostRecent(group.contracts)
    }

    private var exportButton: some View {
        Button {
            if let doc = contractDoc {
                Task { await downloadAndPreview(doc) }
            }
        } label: {
            Group {
                if let doc = contractDoc, downloadingId == doc.id {
                    ProgressView().controlSize(.small)
                } else {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(contractDoc == nil ? .palmSecondary.opacity(0.5) : .palmPrimary)
                }
            }
            .frame(width: 38, height: 38)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous).stroke(Color.palmGlassBorder, lineWidth: 1))
        }
        .disabled(contractDoc == nil)
        .accessibilityLabel("Export contract")
    }

    // MARK: - Assessment context row

    private static let avatarColors: [Color] = [
        Color(red: 13/255, green: 148/255, blue: 136/255),
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 124/255, green: 58/255, blue: 237/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
        Color(red: 8/255, green: 145/255, blue: 178/255),
        Color(red: 220/255, green: 38/255, blue: 38/255),
    ]

    private func assessmentDateLabel(_ group: ClientGroup) -> String {
        guard let d = group.latestDate else { return "Assessment" }
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return "Assessment · \(f.string(from: d))"
    }

    private func assessmentContextRow(_ group: ClientGroup) -> some View {
        let initials = group.name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
        let colorIdx = abs(group.name.hashValue) % Self.avatarColors.count

        return HStack(spacing: 12) {
            Circle()
                .fill(Self.avatarColors[colorIdx])
                .frame(width: 46, height: 46)
                .overlay(
                    Text(String(initials.prefix(2)))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(group.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.palmText)
                    .lineLimit(1)
                Text(assessmentDateLabel(group))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSecondary)
                    .lineLimit(1)
            }

            Spacer()

            if allGroups.count > 1 {
                Menu {
                    ForEach(allGroups) { g in
                        Button {
                            withAnimation { selectedClientId = g.id }
                        } label: {
                            if g.id == group.id {
                                Label(g.name, systemImage: "checkmark")
                            } else {
                                Text(g.name)
                            }
                        }
                    }
                } label: {
                    Text("Change")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.palmTeal600)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule(style: .continuous))
                        .overlay(Capsule(style: .continuous).stroke(Color.palmGlassBorder, lineWidth: 1))
                }
                .accessibilityLabel("Change assessment")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .palmGlassCard(radius: 20)
    }

    // MARK: - Browse all (secondary)

    private var browseAllSection: some View {
        VStack(spacing: 12) {
            Button {
                withAnimation(.easeInOut(duration: 0.25)) { showBrowseAll.toggle() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "folder")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                    Text("Browse all documents")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.palmText)
                    Spacer()
                    Image(systemName: showBrowseAll ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .palmGlassCard(radius: 18)
            .accessibilityLabel("Browse all documents")

            if showBrowseAll {
                filterBar
                searchBar
                LazyVStack(spacing: 12) {
                    ForEach(browseGroups) { group in
                        ClientSection(
                            group: group,
                            isExpanded: expandedClients.contains(group.id),
                            downloadingId: downloadingId,
                            onToggle: { toggleClient(group.id) },
                            onDocTap: { doc in await downloadAndPreview(doc) }
                        )
                    }
                    if browseGroups.isEmpty {
                        Text(isFiltering ? "No matching documents." : "No documents.")
                            .font(.system(size: 13))
                            .foregroundColor(.palmSecondary)
                            .padding(.vertical, 20)
                    }
                }
            }
        }
    }

    // MARK: - Filter Bar (secondary)

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filters, id: \.self) { filter in
                    let isSelected = selectedFilter == filter
                    Button { withAnimation(.easeInOut(duration: 0.2)) { selectedFilter = filter } } label: {
                        Text(filterLabel(filter))
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(isSelected ? .white : .palmText)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                isSelected
                                    ? AnyShapeStyle(Color.palmPrimary)
                                    : AnyShapeStyle(.ultraThinMaterial)
                            )
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(isSelected ? Color.clear : Color.palmGlassBorder, lineWidth: 1)
                            )
                    }
                    .accessibilityLabel("Filter by \(filter)")
                }
            }
            .padding(.vertical, 2)
        }
    }

    // MARK: - Search (secondary)

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
            TextField("Search by client or document...", text: $searchText)
                .font(.system(size: 13))
                .foregroundColor(.palmText)
                .accessibilityLabel("Search documents")
            if !searchText.isEmpty {
                Button { searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.palmSecondary)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.palmGlassBorder, lineWidth: 1))
    }

    // MARK: - Error banner

    @ViewBuilder
    private var errorBanner: some View {
        if let msg = errorMessage {
            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 11))
                Text(msg).font(.system(size: 12))
                Spacer()
                Button { errorMessage = nil } label: {
                    Image(systemName: "xmark").font(.system(size: 10, weight: .bold))
                }
                .accessibilityLabel("Dismiss error")
            }
            .foregroundColor(.red)
            .padding(.horizontal, 18).padding(.vertical, 6)
            .background(Color.red.opacity(0.06))
        }
    }

    // MARK: - Loading / Empty / Error States

    private var loadingState: some View {
        VStack {
            Spacer()
            ProgressView("Loading documents...")
                .foregroundColor(.palmSecondary)
            Spacer()
        }
    }

    private var isFiltering: Bool { !searchText.isEmpty || selectedFilter != "All" }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 44))
                .foregroundColor(.palmSecondary.opacity(0.4))
            Text("No Documents Yet")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Contracts, care plans, notes, and recordings from completed assessments will appear here.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    private var loadFailedState: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 44))
                .foregroundColor(.palmOrange.opacity(0.7))
            Text("Couldn't Load Documents")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Check your connection and try again.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
            Button {
                isLoading = true
                Task { await loadDocuments() }
            } label: {
                Text("Retry")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 9)
                    .background(Color.palmPrimary)
                    .cornerRadius(12)
            }
            .accessibilityLabel("Retry loading documents")
            .padding(.top, 4)
            Spacer()
        }
    }

    // MARK: - Actions

    private func handleTap(_ packet: ResolvedPacket, group: ClientGroup) {
        if let vid = packet.visitId, !vid.isEmpty {
            pushTarget = VisitPushTarget(visitId: vid, clientName: group.name, tab: packet.kind.tabIndex)
        } else if let doc = packet.doc {
            Task { await downloadAndPreview(doc) }
        }
    }

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
                loadFailed = false
                isLoading = false
                onCountChange?(documents.count)
            }
        } catch {
            await MainActor.run {
                loadFailed = true
                errorMessage = documents.isEmpty ? nil : "Failed to refresh documents"
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

// MARK: - Packet Card (Paper Documents primary)

private struct PacketCard: View {
    let packet: ResolvedPacket
    let isDownloading: Bool
    let onTap: () -> Void

    private var isTappable: Bool {
        (packet.visitId?.isEmpty == false) || packet.doc != nil
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .fill(packet.kind.accent)
                    .frame(width: 46, height: 46)
                    .overlay(
                        Image(systemName: packet.kind.icon)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                    )

                VStack(alignment: .leading, spacing: 3) {
                    Text(packet.kind.title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)
                    Text(packet.subtitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmSecondary)
                        .lineLimit(1)
                }

                Spacer()

                if isDownloading {
                    ProgressView().controlSize(.small)
                } else {
                    statusPill
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmChevron)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .palmGlassCard(radius: 18)
        .opacity(isTappable ? 1 : 0.7)
        .disabled(!isTappable)
        .accessibilityLabel("\(packet.kind.title), \(packet.isReady ? "ready" : "pending")")
    }

    private var statusPill: some View {
        let ready = packet.isReady
        let color: Color = ready ? .palmGreen : .palmOrange
        return Text(ready ? "Ready" : "Pending")
            .font(.system(size: 10, weight: .bold))
            .tracking(0.4)
            .foregroundColor(color)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(Capsule(style: .continuous).fill(color.opacity(0.14)))
    }
}

// MARK: - Client Section (collapsible card, secondary "Browse all")

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
            Button(action: onToggle) {
                HStack(spacing: 12) {
                    let initials = group.name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
                    let colorIdx = abs(group.name.hashValue) % Self.avatarColors.count

                    RoundedRectangle(cornerRadius: 11)
                        .fill(Self.avatarColors[colorIdx])
                        .frame(width: 40, height: 40)
                        .overlay(
                            Text(String(initials.prefix(2)))
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text(group.name)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmText)
                            .lineLimit(1)

                        HStack(spacing: 8) {
                            if !group.contracts.isEmpty {
                                HStack(spacing: 3) {
                                    Image(systemName: "doc.text.fill").font(.system(size: 9))
                                    Text("\(group.contracts.count)")
                                }
                                .foregroundColor(.palmPrimary)
                            }
                            if !group.carePlans.isEmpty {
                                HStack(spacing: 3) {
                                    Image(systemName: "list.clipboard.fill").font(.system(size: 9))
                                    Text("\(group.carePlans.count)")
                                }
                                .foregroundColor(.palmTeal600)
                            }
                            if !group.notes.isEmpty {
                                HStack(spacing: 3) {
                                    Image(systemName: "note.text").font(.system(size: 9))
                                    Text("\(group.notes.count)")
                                }
                                .foregroundColor(.palmBlue)
                            }
                            if !group.audio.isEmpty {
                                HStack(spacing: 3) {
                                    Image(systemName: "waveform").font(.system(size: 9))
                                    Text("\(group.audio.count)")
                                }
                                .foregroundColor(.palmPurple)
                            }
                        }
                        .font(.system(size: 10, weight: .semibold))
                    }

                    Spacer()

                    Text("\(group.totalCount)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.palmText)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.85))
                        .cornerRadius(8)

                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                        .animation(.easeInOut(duration: 0.2), value: isExpanded)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .accessibilityLabel("\(group.name), \(group.totalCount) documents")
            .buttonStyle(.plain)

            if isExpanded {
                Divider().padding(.horizontal, 14)

                VStack(spacing: 0) {
                    if !group.contracts.isEmpty {
                        docSection(title: "Contracts", icon: "doc.text.fill", color: .palmPrimary, docs: group.contracts)
                    }
                    if !group.carePlans.isEmpty {
                        docSection(title: "Care Plans", icon: "list.clipboard.fill", color: .palmTeal600, docs: group.carePlans)
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
        .palmGlassCard(radius: 18)
    }

    private func docSection(title: String, icon: String, color: Color, docs: [DocumentItem]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(color)
                Text(title)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.palmText)
                Text("(\(docs.count))")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.palmSecondary)
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
                    .fill(color)
                    .frame(width: 3, height: 30)

                VStack(alignment: .leading, spacing: 2) {
                    Text(document.name)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmText)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        if let fmt = document.format {
                            Text(fmt.uppercased())
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(color)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1)
                                .background(color.opacity(0.1))
                                .cornerRadius(3)
                        }
                        if !formattedDate.isEmpty {
                            Text(formattedDate)
                                .font(.system(size: 10))
                                .foregroundColor(.palmSecondary)
                        }
                        if let s = document.size, s != "-", !s.isEmpty {
                            Text(s)
                                .font(.system(size: 10))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                }

                Spacer()

                if isDownloading {
                    ProgressView().controlSize(.small)
                } else {
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(color.opacity(0.6))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
        }
        .accessibilityLabel("Download \(document.name)")
        .buttonStyle(.plain)
        .disabled(isDownloading)
        .opacity(isDownloading ? 0.6 : 1)
    }
}

#Preview {
    ContractsView()
        .environmentObject(APIService())
}
