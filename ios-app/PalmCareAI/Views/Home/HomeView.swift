import SwiftUI

struct HomeView: View {
    @EnvironmentObject var api: APIService
    var onNavigateToRecord: (() -> Void)?

    @State private var user: User?
    @State private var clients: [Client] = []
    @State private var visits: [Visit] = []
    @State private var isLoading = true

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
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Top bar
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("PALM IT, \(firstName.uppercased()) 🌴")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                                .tracking(0.8)

                            Text(greeting)
                                .font(.system(size: 20, weight: .heavy))
                                .foregroundColor(.palmText)
                                .tracking(-0.4)
                        }

                        Spacer()

                        ZStack {
                            Circle()
                                .fill(LinearGradient.palmPrimary)
                                .frame(width: 36, height: 36)

                            Text(String(firstName.prefix(1)).uppercased())
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .accessibilityLabel("User profile")
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 14)
                    .padding(.bottom, 14)

                    // Stats row
                    HStack(spacing: 9) {
                        HomeStatCard(
                            icon: "person.2.fill",
                            value: "\(clients.count)",
                            label: "Clients",
                            iconBg: Color.palmPrimary.opacity(0.08),
                            iconColor: .palmPrimary
                        )
                        HomeStatCard(
                            icon: "calendar.badge.clock",
                            value: "\(visitsThisWeek)",
                            label: "This Week",
                            iconBg: Color.blue.opacity(0.08),
                            iconColor: .blue
                        )
                        HomeStatCard(
                            icon: "clock",
                            value: "\(pendingVisits)",
                            label: "Pending",
                            iconBg: Color.orange.opacity(0.08),
                            iconColor: .orange
                        )
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 14)

                    // CTA bar
                    Button { onNavigateToRecord?() } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("START RECORDING")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white.opacity(0.6))
                                    .tracking(1.5)

                                Text("Palm It Now")
                                    .font(.system(size: 16, weight: .heavy))
                                    .foregroundColor(.white)
                                    .tracking(-0.3)

                                Text("Tap to record a new assessment")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.62))
                            }

                            Spacer()

                            ZStack {
                                Circle()
                                    .fill(Color.white.opacity(0.18))
                                    .frame(width: 42, height: 42)
                                    .overlay(Circle().stroke(Color.white.opacity(0.22), lineWidth: 1))

                                Image(systemName: "mic.fill")
                                    .font(.system(size: 18))
                                    .foregroundColor(.white)
                            }
                        }
                        .padding(16)
                        .background(
                            ZStack {
                                LinearGradient.palmPrimary
                                // Decorative circle
                                Circle()
                                    .fill(Color.white.opacity(0.07))
                                    .frame(width: 100, height: 100)
                                    .offset(x: 80, y: -30)
                            }
                        )
                        .cornerRadius(12)
                        .shadow(color: Color.palmPrimary.opacity(0.3), radius: 8, y: 4)
                    }
                    .accessibilityLabel("Start new recording")
                    .padding(.horizontal, 14)
                    .padding(.bottom, 18)

                    // Recent Visits
                    HStack {
                        Text("Recent Visits")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.palmText)

                        Spacer()

                        NavigationLink(destination: AssessmentsListView().environmentObject(api)) {
                            Text("See all")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmPrimary)
                        }
                        .accessibilityLabel("See all visits")
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 10)

                    if isLoading {
                        HStack {
                            Spacer()
                            ProgressView().padding(40)
                            Spacer()
                        }
                    } else if visits.isEmpty {
                        EmptyStateCard(
                            icon: "waveform.path",
                            title: "No visits yet",
                            subtitle: "Start a new assessment to see visits here"
                        )
                        .padding(.horizontal, 14)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(visits.prefix(5)) { visit in
                                NavigationLink(destination:
                                    VisitDetailView(
                                        visitId: visit.id,
                                        clientName: visit.client?.full_name
                                    ).environmentObject(api)
                                ) {
                                    VisitRow(visit: visit)
                                }
                                .accessibilityLabel("Visit for \(visit.client?.full_name ?? "Unknown"), \(visit.status)")
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 14)
                    }

                    Spacer().frame(height: 100)
                }
            }
            .background(Color.palmBackground)
            .refreshable { await loadData(forceRefresh: true) }
            .task { await loadData() }
        }
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

    private var pendingVisits: Int {
        let pending = visits.filter {
            let s = $0.status.lowercased()
            return s == "pending" || s == "processing" || s == "uploading"
        }
        return pending.count
    }

    private func loadData(forceRefresh: Bool = false) async {
        do {
            async let fetchedUser = api.fetchUser(forceRefresh: forceRefresh)
            async let fetchedClients = api.fetchClients(forceRefresh: forceRefresh)
            async let fetchedVisits = api.fetchVisits(forceRefresh: forceRefresh)

            let (u, c, v) = try await (fetchedUser, fetchedClients, fetchedVisits)
            await MainActor.run {
                user = u
                clients = c
                visits = v
                isLoading = false
            }
        } catch {
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Subviews

struct HomeStatCard: View {
    let icon: String
    let value: String
    let label: String
    let iconBg: Color
    let iconColor: Color

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(iconBg)
                    .frame(width: 32, height: 32)

                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(iconColor)
            }

            Text(value)
                .font(.system(size: 20, weight: .heavy))
                .foregroundColor(.palmText)
                .tracking(-0.5)

            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.palmSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 13)
        .padding(.horizontal, 8)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
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
        case "pending": return .orange
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

            Text(visit.status.capitalized)
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
        guard let parsedDate = date else { return isoString }
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
}
