import SwiftUI

struct HomeView: View {
    @EnvironmentObject var api: APIService

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

    private var userName: String {
        user?.full_name ?? "there"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Greeting header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(greeting),")
                            .font(.title3)
                            .foregroundColor(.palmSecondary)

                        Text(userName)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    // Stats cards
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                    ], spacing: 12) {
                        StatCard(
                            title: "Total Clients",
                            value: "\(clients.count)",
                            icon: "person.2.fill",
                            color: .palmPrimary
                        )

                        StatCard(
                            title: "This Week",
                            value: "\(visitsThisWeek)",
                            icon: "calendar.badge.clock",
                            color: .palmTeal
                        )

                        StatCard(
                            title: "Pending",
                            value: "\(pendingVisits)",
                            icon: "clock.badge.exclamationmark",
                            color: .orange
                        )
                    }
                    .padding(.horizontal, 20)

                    // New Assessment CTA
                    Button {
                        // Navigate to record tab
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("New Assessment")
                                    .font(.headline)
                                    .foregroundColor(.white)

                                Text("Record a visit with a client")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.8))
                            }

                            Spacer()

                            Image(systemName: "mic.circle.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white.opacity(0.9))
                        }
                        .padding(20)
                        .background(
                            LinearGradient(
                                colors: [Color.palmPrimary, Color.palmPrimary.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(16)
                    }
                    .padding(.horizontal, 20)

                    // Recent Visits
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Recent Visits")
                                .font(.title3.weight(.semibold))
                                .foregroundColor(.palmText)

                            Spacer()

                            Button("See all") {}
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.palmPrimary)
                        }
                        .padding(.horizontal, 20)

                        if isLoading {
                            HStack {
                                Spacer()
                                ProgressView()
                                    .padding(40)
                                Spacer()
                            }
                        } else if visits.isEmpty {
                            EmptyStateCard(
                                icon: "waveform.path",
                                title: "No visits yet",
                                subtitle: "Start a new assessment to see visits here"
                            )
                            .padding(.horizontal, 20)
                        } else {
                            LazyVStack(spacing: 8) {
                                ForEach(visits.prefix(5)) { visit in
                                    VisitRow(visit: visit)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }

                    Spacer().frame(height: 100)
                }
            }
            .background(Color(.systemGroupedBackground))
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
        }
    }

    private var visitsThisWeek: Int {
        let calendar = Calendar.current
        let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: Date())?.start ?? Date()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return visits.filter { visit in
            if let date = formatter.date(from: visit.created_at) {
                return date >= startOfWeek
            }
            return false
        }.count
    }

    private var pendingVisits: Int {
        visits.filter { $0.status.lowercased() == "pending" || $0.status.lowercased() == "processing" }.count
    }

    private func loadData() async {
        do {
            async let fetchedUser = api.fetchUser()
            async let fetchedClients = api.fetchClients()
            async let fetchedVisits = api.fetchVisits()

            let (u, c, v) = try await (fetchedUser, fetchedClients, fetchedVisits)
            await MainActor.run {
                user = u
                clients = c
                visits = v
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

// MARK: - Subviews

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.12))
                    .frame(width: 36, height: 36)

                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(color)
            }

            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.palmText)

            Text(title)
                .font(.system(size: 11))
                .foregroundColor(.palmSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }
}

struct VisitRow: View {
    let visit: Visit

    var statusColor: Color {
        switch visit.status.lowercased() {
        case "completed": return .green
        case "processing": return .orange
        case "pending": return .yellow
        default: return .palmSecondary
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.palmPrimary.opacity(0.1))
                    .frame(width: 44, height: 44)

                Image(systemName: "waveform")
                    .font(.system(size: 18))
                    .foregroundColor(.palmPrimary)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(visit.client?.full_name ?? "Client")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.palmText)

                Text(formattedDate(visit.created_at))
                    .font(.caption)
                    .foregroundColor(.palmSecondary)
            }

            Spacer()

            Text(visit.status.capitalized)
                .font(.caption.weight(.medium))
                .foregroundColor(statusColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.12))
                .cornerRadius(8)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 4, y: 1)
    }

    private func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: date)
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
        .background(Color.white)
        .cornerRadius(14)
    }
}

#Preview {
    HomeView()
        .environmentObject(APIService.shared)
}
