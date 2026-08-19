import SwiftUI

struct HomeView: View {
    @EnvironmentObject var api: APIService
    @EnvironmentObject var session: AssessmentSession
    var onNavigateToRecord: (() -> Void)?

    @State private var user: User?
    @State private var clients: [Client] = []
    @State private var visits: [Visit] = []
    @State private var isLoading = true
    @State private var loadError: String?

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }

    private var firstName: String {
        let full = user?.full_name ?? "there"
        return full.split(separator: " ").first.map(String.init) ?? full
    }

    var body: some View {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(greeting)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.palmSage)

                            Text(firstName)
                                .font(.system(size: 34, weight: .bold))
                                .foregroundColor(.palmInk)
                                .tracking(-1.36)
                        }

                        Spacer()

                        Button { onNavigateToRecord?() } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 20, weight: .regular))
                                .foregroundColor(.palmInk)
                                .frame(width: 44, height: 44)
                                .background(
                                    Circle()
                                        .fill(Color.white.opacity(0.62))
                                        .overlay(Circle().stroke(Color.white.opacity(0.90), lineWidth: 1))
                                )
                                .shadow(color: PalmGlass.shadow, radius: 10, y: 4)
                        }
                        .accessibilityLabel("Start new recording")
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    .padding(.bottom, 18)

                    HStack(spacing: 8) {
                        HomeStatCard(
                            value: "\(clients.count)",
                            label: "Clients"
                        )
                        HomeStatCard(
                            value: "\(dueCount)",
                            label: "Due"
                        )
                        HomeStatCard(
                            value: "\(needsReviewVisits.count)",
                            label: "Review"
                        )
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 12)

                    Button { onNavigateToRecord?() } label: {
                        HStack(spacing: 14) {
                            PalmWaveformBars(color: .white)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Palm It Now")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .tracking(-0.32)

                                Text(palmItSubtitle)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.white.opacity(0.78))
                                    .lineLimit(1)
                            }

                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 16)
                        .frame(maxWidth: .infinity, minHeight: 72, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 28, style: .continuous)
                                .fill(Color.palmPrimary)
                        )
                        .shadow(color: Color(red: 13/255, green: 148/255, blue: 136/255).opacity(0.28), radius: 14, y: 10)
                    }
                    .accessibilityLabel("Palm It Now")
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)

                    if isLoading {
                        HStack {
                            Spacer()
                            ProgressView().padding(40)
                            Spacer()
                        }
                    } else if loadError != nil {
                        errorView
                    } else if attentionVisits.isEmpty {
                        EmptyStateCard(
                            icon: "checkmark.circle",
                            title: "Nothing waiting on you",
                            subtitle: "Palm It to start a visit."
                        )
                        .padding(.horizontal, 24)
                    } else {
                        reviewCard
                            .padding(.horizontal, 24)
                    }

                    Spacer().frame(height: 100)
                }
            }
            .background(PalmGlassBackground())
            .refreshable { await loadData(forceRefresh: true) }
            .task { await loadData() }
    }

    private var dueCount: Int {
        followUpTomorrowVisits.count + awaitingSignatureVisits.count
    }

    private var palmItSubtitle: String {
        if let next = followUpTomorrowVisits.first,
           let name = next.client?.full_name.split(separator: " ").first {
            return "\(name) is due tomorrow"
        }
        if let next = awaitingSignatureVisits.first,
           let name = next.client?.full_name.split(separator: " ").first {
            return "\(name) awaits a signature"
        }
        if !needsReviewVisits.isEmpty {
            return "\(needsReviewVisits.count) packet\(needsReviewVisits.count == 1 ? "" : "s") need review"
        }
        return "Tap to record a visit"
    }

    /// Every visit that still needs the caregiver, in priority order and
    /// de-duplicated. Paper Home shows these as one "Needs review" card.
    private var attentionVisits: [Visit] {
        var seen = Set<Visit.ID>()
        var out: [Visit] = []
        let ordered = needsReviewVisits
            + failedProcessingVisits
            + processingVisits
            + awaitingSignatureVisits
            + bouncedSendVisits
            + readyToSendVisits
            + followUpTomorrowVisits
        for visit in ordered where seen.insert(visit.id).inserted {
            out.append(visit)
        }
        return out
    }

    private var attentionTitle: String {
        if !needsReviewVisits.isEmpty { return "Needs review" }
        if !failedProcessingVisits.isEmpty || !bouncedSendVisits.isEmpty { return "Needs attention" }
        if !processingVisits.isEmpty { return "In progress" }
        if !awaitingSignatureVisits.isEmpty { return "Awaiting signature" }
        if !readyToSendVisits.isEmpty { return "Ready to send" }
        if !followUpTomorrowVisits.isEmpty { return "Coming up" }
        return "Recent"
    }

    private var needsReviewVisits: [Visit] {
        visits.filter { $0.status.lowercased() == "pending_review" }
    }

    private var failedProcessingVisits: [Visit] {
        visits.filter { visit in
            let s = visit.status.lowercased()
            if s == "pipeline_failed" || s == "failed" { return true }
            return Self.visitHasFailedStep(visit)
        }
        .filter { $0.status.lowercased() != "pending_review" }
    }

    private var processingVisits: [Visit] {
        visits.filter { visit in
            let s = visit.status.lowercased()
            if s == "processing" || s == "uploading" || s == "pending" { return true }
            return Self.visitIsActivelyProcessing(visit)
                && !Self.visitHasFailedStep(visit)
                && s != "pending_review"
                && s != "pipeline_failed"
                && s != "completed"
        }
    }

    private var followUpTomorrowVisits: [Visit] {
        let calendar = Calendar.current
        guard let tomorrow = calendar.date(byAdding: .day, value: 1, to: Date()) else { return [] }
        return visits.filter { visit in
            guard let raw = visit.scheduled_start, let date = parseISO8601(raw) else { return false }
            return calendar.isDate(date, inSameDayAs: tomorrow)
        }
    }

    private var awaitingSignatureVisits: [Visit] {
        visits.filter { $0.agreement_send?.isAwaitingSignature == true }
    }

    private var bouncedSendVisits: [Visit] {
        visits.filter { ($0.agreement_send?.status ?? "").lowercased() == "bounced" }
    }

    private var readyToSendVisits: [Visit] {
        // Completed packets with no send yet, and not claimed by other buckets.
        let claimed = Set(needsReviewVisits.map(\.id)
            + failedProcessingVisits.map(\.id)
            + processingVisits.map(\.id)
            + awaitingSignatureVisits.map(\.id)
            + bouncedSendVisits.map(\.id)
            + followUpTomorrowVisits.map(\.id))
        return visits.filter { visit in
            guard !claimed.contains(visit.id) else { return false }
            if visit.agreement_send != nil { return false }
            return visit.status.lowercased() == "completed"
        }
    }

    // MARK: - Needs review card (Paper App Glass · Home 4AT-0)

    private var reviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(attentionTitle)
                .font(.system(size: 12, weight: .medium))
                .tracking(0.48)
                .foregroundColor(.palmSlateLabel)

            ForEach(Array(attentionVisits.prefix(6).enumerated()), id: \.element.id) { index, visit in
                if index > 0 {
                    Rectangle()
                        .fill(Color.palmHint.opacity(0.14))
                        .frame(height: 1)
                }
                NavigationLink(destination:
                    VisitDetailView(
                        visitId: visit.id,
                        clientName: visit.client?.full_name
                    ).environmentObject(api)
                ) {
                    reviewRow(visit: visit)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(attentionTitle): \(visit.client?.full_name ?? "Client")")
            }
        }
        .padding(16)
        .palmGlassCard(radius: 28, fillOpacity: 0.58)
    }

    private func reviewRow(visit: Visit) -> some View {
        let name = visit.client?.full_name ?? "Client"
        let initials = name.split(separator: " ").prefix(2).map { String($0.prefix(1)) }.joined().uppercased()
        let tint = rowTint(visit)
        let age = relativeAge(visit)
        return HStack(spacing: 12) {
            Capsule(style: .continuous)
                .fill(tint)
                .frame(width: 4, height: 40)

            Circle()
                .fill(tint.opacity(0.14))
                .frame(width: 44, height: 44)
                .overlay(
                    Text(initials.isEmpty ? "?" : initials)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(tint)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmInkSlate)
                    .tracking(-0.3)
                    .lineLimit(1)
                Text(rowStatus(visit))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSlateLabel)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            HStack(spacing: 10) {
                if !age.isEmpty {
                    Text(age)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(tint == .palmPrimary ? .palmTeal600 : tint)
                        .padding(.horizontal, 10)
                        .frame(height: 24)
                        .background(
                            tint.opacity(0.10),
                            in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                        )
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmHint)
            }
        }
    }

    private func rowTint(_ visit: Visit) -> Color {
        let id = visit.id
        if needsReviewVisits.contains(where: { $0.id == id }) { return .palmPrimary }
        if failedProcessingVisits.contains(where: { $0.id == id })
            || bouncedSendVisits.contains(where: { $0.id == id }) {
            return Color(red: 220 / 255, green: 38 / 255, blue: 38 / 255)
        }
        if processingVisits.contains(where: { $0.id == id }) { return .palmBlue }
        if awaitingSignatureVisits.contains(where: { $0.id == id }) { return .palmPurple }
        if readyToSendVisits.contains(where: { $0.id == id }) { return .palmPrimary }
        if followUpTomorrowVisits.contains(where: { $0.id == id }) { return .palmPurple }
        return .palmPrimary
    }

    private func rowStatus(_ visit: Visit) -> String {
        let id = visit.id
        if needsReviewVisits.contains(where: { $0.id == id }) { return "Ready to review" }
        if failedProcessingVisits.contains(where: { $0.id == id }) { return "Processing failed" }
        if bouncedSendVisits.contains(where: { $0.id == id }) { return "Delivery bounced" }
        if processingVisits.contains(where: { $0.id == id }) { return "Still processing" }
        if awaitingSignatureVisits.contains(where: { $0.id == id }) { return "Awaiting signature" }
        if readyToSendVisits.contains(where: { $0.id == id }) { return "Ready to send" }
        if followUpTomorrowVisits.contains(where: { $0.id == id }) { return "Due tomorrow" }
        return visit.displayStatus
    }

    /// Compact age badge (e.g. "28h", "3d") from the visit's created date.
    private func relativeAge(_ visit: Visit) -> String {
        guard let date = parseISO8601(visit.created_at) else { return "" }
        let secs = Date().timeIntervalSince(date)
        if secs < 3600 { return "\(max(1, Int(secs / 60)))m" }
        if secs < 86_400 { return "\(Int(secs / 3600))h" }
        if secs < 604_800 { return "\(Int(secs / 86_400))d" }
        return "\(Int(secs / 604_800))w"
    }

    private static func visitHasFailedStep(_ visit: Visit) -> Bool {
        guard let ps = visit.pipeline_state else { return false }
        for key in ["transcription", "diarization", "billing", "note", "contract"] {
            if let dict = ps[key]?.value as? [String: Any],
               let status = dict["status"] as? String,
               status.lowercased() == "failed" {
                return true
            }
        }
        return false
    }

    private static func visitIsActivelyProcessing(_ visit: Visit) -> Bool {
        guard let ps = visit.pipeline_state else { return false }
        for key in ["transcription", "billing", "note", "contract"] {
            if let dict = ps[key]?.value as? [String: Any],
               let status = dict["status"] as? String {
                let s = status.lowercased()
                if s == "processing" || s == "running" || s == "queued" || s == "pending" {
                    return true
                }
            }
        }
        return false
    }

    private var visitsThisWeek: Int {
        let calendar = Calendar.current
        let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        return visits.filter { visit in
            if let date = parseISO8601(visit.created_at) {
                return date >= startOfWeek
            }
            return false
        }.count
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }

    private func loadData(forceRefresh: Bool = false) async {
        await MainActor.run { if visits.isEmpty && clients.isEmpty { isLoading = true } }
        do {
            async let fetchedUser = api.fetchUser(forceRefresh: forceRefresh)
            async let fetchedClients = api.fetchClients(forceRefresh: forceRefresh)
            async let fetchedVisits = api.fetchVisits(forceRefresh: forceRefresh)

            let (u, c, v) = try await (fetchedUser, fetchedClients, fetchedVisits)
            await MainActor.run {
                user = u
                clients = c
                visits = v
                loadError = nil
                isLoading = false
            }
        } catch {
            await MainActor.run {
                loadError = error.localizedDescription
                isLoading = false
            }
        }
    }

    private var errorView: some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 40, weight: .regular))
                .foregroundStyle(.secondary)
                .symbolRenderingMode(.hierarchical)
            Text("Couldn't Load Home")
                .font(.title3.weight(.semibold))
            Text(loadError ?? "Check your connection and try again.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try Again") {
                loadError = nil
                Task { await loadData() }
            }
            .buttonStyle(.borderedProminent)
            .tint(.palmPrimary)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 28)
        .padding(.vertical, 40)
    }
}

// MARK: - Subviews

struct HomeStatCard: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .tracking(0.48)
                .foregroundColor(.palmSlateLabel)
            Text(value)
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.palmInkSlate)
                .tracking(-0.84)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 88)
        .padding(.vertical, 16)
        .padding(.horizontal, 14)
        .palmGlassCard(radius: 24, fillOpacity: 0.62)
        .accessibilityLabel("\(label): \(value)")
    }
}

struct VisitRow: View {
    let visit: Visit

    private static let avatarColors: [Color] = [
        Color(red: 13/255, green: 148/255, blue: 136/255),
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 220/255, green: 38/255, blue: 38/255),
        Color(red: 124/255, green: 58/255, blue: 237/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
        Color(red: 8/255, green: 145/255, blue: 178/255),
    ]

    var statusColor: Color {
        switch visit.status.lowercased() {
        case "completed": return .green
        case "processing": return .blue
        case "pending", "pending_review": return .orange
        case "pipeline_failed", "failed": return .red
        default: return .palmSecondary
        }
    }

    var statusBg: Color {
        statusColor.opacity(0.12)
    }

    var body: some View {
        HStack(spacing: 11) {
            let name = visit.client?.full_name ?? "Client"
            let initials = name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
            let colorIndex = abs(name.hashValue) % Self.avatarColors.count

            RoundedRectangle(cornerRadius: 10)
                .fill(Self.avatarColors[colorIndex])
                .frame(width: 38, height: 38)
                .overlay(
                    Text(initials)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .tracking(-0.5)
                )

            VStack(alignment: .leading, spacing: 1) {
                Text(name)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                    .lineLimit(1)

                Text(formattedDate(visit.created_at))
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }

            Spacer()

            Text(visit.displayStatus)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(statusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(statusBg)
                .cornerRadius(20)
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .palmGlassCard(radius: 18, fillOpacity: 0.62)
    }

    private func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let parsedDate = date else { return "—" }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: parsedDate)
    }
}

struct EmptyStateCard: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundColor(.palmSecondary.opacity(0.5))

            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.palmText)

            Text(subtitle)
                .font(.caption)
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .palmGlassCard(radius: PalmGlass.cardRadius, fillOpacity: 0.58)
    }
}

#Preview {
    HomeView()
        .environmentObject(APIService.shared)
        .environmentObject(AssessmentSession(api: APIService.shared))
}
