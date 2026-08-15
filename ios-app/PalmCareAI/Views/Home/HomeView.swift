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
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(greeting)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.palmSecondary)

                            Text(firstName)
                                .font(.system(size: 32, weight: .heavy))
                                .foregroundColor(.palmText)
                                .tracking(-0.8)
                        }

                        Spacer()

                        Button { onNavigateToRecord?() } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.palmText)
                                .frame(width: 40, height: 40)
                                .background(
                                    Circle()
                                        .fill(Color.white.opacity(0.72))
                                        .overlay(Circle().stroke(Color.palmGlassBorder, lineWidth: 1))
                                )
                                .shadow(color: PalmGlass.shadow, radius: 10, y: 4)
                        }
                        .accessibilityLabel("Start new recording")
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 14)
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
                            Image(systemName: "waveform")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(.white.opacity(0.95))
                                .frame(width: 36)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Palm It Now")
                                    .font(.system(size: 17, weight: .heavy))
                                    .foregroundColor(.white)
                                    .tracking(-0.3)

                                Text(palmItSubtitle)
                                    .font(.system(size: 13, weight: .medium))
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
                        .shadow(color: PalmGlass.tealShadow, radius: 14, y: 10)
                    }
                    .accessibilityLabel("Palm It Now")
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)

                    HStack {
                        Text("Your Queue")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.palmSecondary)

                        Spacer()

                        NavigationLink(destination: AssessmentsListView().environmentObject(api)) {
                            Text("See all")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmPrimary)
                        }
                        .accessibilityLabel("See all visits")
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 10)

                    if isLoading {
                        HStack {
                            Spacer()
                            ProgressView().padding(40)
                            Spacer()
                        }
                    } else if loadError != nil {
                        errorView
                    } else if queueIsEmpty {
                        EmptyStateCard(
                            icon: "checkmark.circle",
                            title: "Nothing waiting on you",
                            subtitle: "Palm It to start a visit, or check See all for past assessments."
                        )
                        .padding(.horizontal, 24)
                    } else {
                        VStack(alignment: .leading, spacing: 16) {
                            if !session.pendingUploads.isEmpty {
                                queueSection(
                                    title: "Failed upload",
                                    subtitle: "Audio is still on this iPhone",
                                    tint: .red
                                ) {
                                    ForEach(session.pendingUploads) { item in
                                        Button {
                                            onNavigateToRecord?()
                                        } label: {
                                            queueRow(
                                                title: item.clientName ?? "Saved recording",
                                                detail: item.lastError ?? "Waiting for a signal",
                                                badge: "Retry",
                                                badgeColor: .red
                                            )
                                        }
                                        .buttonStyle(.plain)
                                        .accessibilityLabel("Retry upload for \(item.clientName ?? "saved recording")")
                                    }
                                }
                            }

                            queueVisitSection(
                                title: "Needs review",
                                tint: .palmOrange,
                                visits: needsReviewVisits,
                                badge: "Review"
                            )
                            queueVisitSection(
                                title: "Failed processing",
                                tint: .red,
                                visits: failedProcessingVisits,
                                badge: "Fix"
                            )
                            queueVisitSection(
                                title: "Still processing",
                                tint: .palmBlue,
                                visits: processingVisits,
                                badge: "Live"
                            )
                            queueVisitSection(
                                title: "Awaiting signature",
                                tint: .palmPurple,
                                visits: awaitingSignatureVisits,
                                badge: "Sent"
                            )
                            queueVisitSection(
                                title: "Bounced",
                                tint: .red,
                                visits: bouncedSendVisits,
                                badge: "Bounce"
                            )
                            queueVisitSection(
                                title: "Ready to send",
                                tint: .palmPrimary,
                                visits: readyToSendVisits,
                                badge: "Send"
                            )
                            queueVisitSection(
                                title: "Follow up tomorrow",
                                tint: .palmPurple,
                                visits: followUpTomorrowVisits,
                                badge: "Tomorrow"
                            )
                        }
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

    private var queueIsEmpty: Bool {
        session.pendingUploads.isEmpty
            && needsReviewVisits.isEmpty
            && failedProcessingVisits.isEmpty
            && processingVisits.isEmpty
            && awaitingSignatureVisits.isEmpty
            && bouncedSendVisits.isEmpty
            && readyToSendVisits.isEmpty
            && followUpTomorrowVisits.isEmpty
    }

    private var queueActionCount: Int {
        session.pendingUploads.count
            + needsReviewVisits.count
            + failedProcessingVisits.count
            + awaitingSignatureVisits.count
            + bouncedSendVisits.count
            + readyToSendVisits.count
            + followUpTomorrowVisits.count
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

    private func queueVisitSection(
        title: String,
        tint: Color,
        visits: [Visit],
        badge: String
    ) -> some View {
        Group {
            if !visits.isEmpty {
                queueSection(title: title, subtitle: nil, tint: tint) {
                    ForEach(visits.prefix(5)) { visit in
                        NavigationLink(destination:
                            VisitDetailView(
                                visitId: visit.id,
                                clientName: visit.client?.full_name
                            ).environmentObject(api)
                        ) {
                            queueRow(
                                title: visit.client?.full_name ?? "Client",
                                detail: formattedQueueDate(visit),
                                badge: badge,
                                badgeColor: tint
                            )
                        }
                        .accessibilityLabel("\(title): \(visit.client?.full_name ?? "Client")")
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func queueSection<Content: View>(
        title: String,
        subtitle: String?,
        tint: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmSecondary)
            VStack(spacing: 0) {
                content()
            }
            .palmGlassCard(radius: PalmGlass.cardRadius, fillOpacity: 0.58, padding: 4)
            .overlay(alignment: .leading) {
                Capsule()
                    .fill(tint)
                    .frame(width: 3)
                    .padding(.vertical, 14)
                    .padding(.leading, 10)
            }
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.palmSecondary)
            }
        }
    }

    private func queueRow(title: String, detail: String, badge: String, badgeColor: Color) -> some View {
        HStack(spacing: 12) {
            let initials = title.split(separator: " ").prefix(2).map { String($0.prefix(1)) }.joined().uppercased()
            Circle()
                .fill(Color.palmPrimary.opacity(0.12))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(initials.isEmpty ? "?" : initials)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.palmPrimary)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.palmText)
                    .lineLimit(1)
                Text(detail)
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            Text(badge)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(badgeColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(badgeColor.opacity(0.12))
                .clipShape(Capsule())
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmSecondary.opacity(0.45))
        }
        .padding(.leading, 14)
        .padding(.trailing, 12)
        .padding(.vertical, 12)
    }

    private func formattedQueueDate(_ visit: Visit) -> String {
        if let scheduled = visit.scheduled_start, let date = parseISO8601(scheduled) {
            let display = DateFormatter()
            display.dateStyle = .medium
            display.timeStyle = .short
            return "Scheduled \(display.string(from: date))"
        }
        if let date = parseISO8601(visit.created_at) {
            let display = DateFormatter()
            display.dateStyle = .medium
            display.timeStyle = .short
            return display.string(from: date)
        }
        return visit.displayStatus
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
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36))
                .foregroundColor(.palmOrange)
            Text("Something went wrong")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.palmText)
            Text(loadError ?? "")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button {
                loadError = nil
                Task { await loadData() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12, weight: .bold))
                    Text("Try Again")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                .foregroundColor(.palmSecondary)
            Text(value)
                .font(.system(size: 28, weight: .heavy))
                .foregroundColor(.palmText)
                .tracking(-0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 16)
        .padding(.horizontal, 14)
        .palmGlassCard(radius: PalmGlass.chipRadius, fillOpacity: 0.62)
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
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
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
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
    }
}

#Preview {
    HomeView()
        .environmentObject(APIService.shared)
        .environmentObject(AssessmentSession(api: APIService.shared))
}
