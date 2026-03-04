import SwiftUI

struct AssessmentsListView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var visits: [Visit] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedFilter = "all"

    private let filters = [
        ("all", "All"),
        ("completed", "Completed"),
        ("processing", "Processing"),
        ("pending", "Pending"),
    ]

    private var filteredVisits: [Visit] {
        var result = visits

        if selectedFilter != "all" {
            result = result.filter { $0.status.lowercased() == selectedFilter }
        }

        if !searchText.isEmpty {
            result = result.filter { visit in
                let clientName = visit.client?.full_name ?? ""
                return clientName.localizedCaseInsensitiveContains(searchText)
                    || visit.status.localizedCaseInsensitiveContains(searchText)
                    || visit.created_at.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar

            if isLoading {
                Spacer()
                ProgressView()
                    .scaleEffect(1.2)
                Spacer()
            } else if filteredVisits.isEmpty {
                Spacer()
                emptyState
                Spacer()
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 10) {
                        ForEach(filteredVisits) { visit in
                            NavigationLink(destination:
                                VisitDetailView(
                                    visitId: visit.id,
                                    clientName: visit.client?.full_name
                                ).environmentObject(api)
                            ) {
                                assessmentCard(visit)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .padding(.bottom, 80)
                }
            }
        }
        .background(Color.palmBackground)
        .navigationTitle("Assessments")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search by client name...")
        .refreshable { await loadVisits(forceRefresh: true) }
        .task { await loadVisits() }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filters, id: \.0) { value, label in
                    let count = value == "all" ? visits.count : visits.filter({ $0.status.lowercased() == value }).count
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { selectedFilter = value }
                    } label: {
                        HStack(spacing: 5) {
                            Text(label)
                                .font(.system(size: 12, weight: .semibold))
                            Text("\(count)")
                                .font(.system(size: 10, weight: .bold))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1)
                                .background(
                                    selectedFilter == value
                                        ? Color.white.opacity(0.3)
                                        : Color.palmSecondary.opacity(0.1)
                                )
                                .cornerRadius(6)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(selectedFilter == value ? filterColor(value) : Color(UIColor.secondarySystemGroupedBackground))
                        .foregroundColor(selectedFilter == value ? .white : .palmSecondary)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(selectedFilter == value ? Color.clear : Color.palmBorder, lineWidth: 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .overlay(Divider(), alignment: .bottom)
    }

    private func filterColor(_ filter: String) -> Color {
        switch filter {
        case "completed": return .palmGreen
        case "processing": return .palmBlue
        case "pending": return .palmOrange
        default: return .palmPrimary
        }
    }

    // MARK: - Assessment Card

    private func assessmentCard(_ visit: Visit) -> some View {
        let statusColor = visitStatusColor(visit.status)
        let clientName = visit.client?.full_name ?? "Unknown Client"
        let initials = clientName.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()

        return HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10)
                .fill(avatarColor(clientName))
                .frame(width: 44, height: 44)
                .overlay(
                    Text(initials)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(clientName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    HStack(spacing: 3) {
                        Image(systemName: "calendar")
                            .font(.system(size: 10))
                        Text(formattedDate(visit.created_at))
                            .font(.system(size: 11))
                    }
                    .foregroundColor(.palmSecondary)

                    if let pipelineState = visit.pipeline_state {
                        let completedSteps = pipelineState.values.filter {
                            ($0.value as? [String: Any])?["status"] as? String == "completed"
                        }.count
                        if completedSteps > 0 {
                            HStack(spacing: 3) {
                                Image(systemName: "checkmark.circle")
                                    .font(.system(size: 10))
                                Text("\(completedSteps)/5 steps")
                                    .font(.system(size: 11))
                            }
                            .foregroundColor(.palmGreen)
                        }
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Circle().fill(statusColor).frame(width: 6, height: 6)
                    Text(visit.status.capitalized)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(statusColor)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.1))
                .cornerRadius(8)

                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.palmSecondary.opacity(0.5))
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "waveform.path")
                .font(.system(size: 40))
                .foregroundColor(.palmSecondary.opacity(0.35))
            Text(searchText.isEmpty ? "No Assessments" : "No Results")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text(searchText.isEmpty
                 ? "Assessments will appear here once you start recording."
                 : "No assessments match your search.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 40)
    }

    // MARK: - Helpers

    private func visitStatusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "completed": return .palmGreen
        case "processing": return .palmBlue
        case "pending": return .palmOrange
        case "failed": return .red
        default: return .palmSecondary
        }
    }

    private static let avatarColors: [Color] = [
        Color(red: 13/255, green: 148/255, blue: 136/255),
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 220/255, green: 38/255, blue: 38/255),
        Color(red: 124/255, green: 58/255, blue: 237/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
        Color(red: 8/255, green: 145/255, blue: 178/255),
    ]

    private func avatarColor(_ name: String) -> Color {
        Self.avatarColors[abs(name.hashValue) % Self.avatarColors.count]
    }

    private func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let parsedDate = date else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: parsedDate)
    }

    private func loadVisits(forceRefresh: Bool = false) async {
        do {
            let fetched = try await api.fetchVisits(forceRefresh: forceRefresh)
            await MainActor.run {
                visits = fetched.sorted { $0.created_at > $1.created_at }
                isLoading = false
            }
        } catch {
            await MainActor.run { isLoading = false }
        }
    }
}
