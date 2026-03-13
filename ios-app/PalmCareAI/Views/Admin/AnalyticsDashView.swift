import SwiftUI

@MainActor
class AnalyticsDashViewModel: ObservableObject {
    @Published var metrics: AnalyticsMetrics?
    @Published var loading = false
    @Published var error: String?

    struct AnalyticsMetrics {
        var totalAgencies: Int = 0
        var totalInvestors: Int = 0
        var emailsSent: Int = 0
        var callsMade: Int = 0
    }

    func load() async {
        loading = true
        error = nil
        do {
            async let leads = APIService.shared.fetchSalesLeads(page: 0, limit: 1000)
            async let investors = APIService.shared.fetchInvestors()

            let (leadsResult, investorsResult) = try await (leads, investors)

            var m = AnalyticsMetrics()
            m.totalAgencies = leadsResult.count
            m.totalInvestors = investorsResult.count
            m.emailsSent = leadsResult.reduce(0) { $0 + ($1.email_send_count ?? 0) }
                + investorsResult.reduce(0) { $0 + ($1.email_send_count ?? 0) }
            m.callsMade = leadsResult.filter { $0.is_contacted == true }.count
            metrics = m
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

struct AnalyticsDashView: View {
    @StateObject private var vm = AnalyticsDashViewModel()

    var body: some View {
        ScrollView {
            if vm.loading && vm.metrics == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, 80)
            } else if let error = vm.error, vm.metrics == nil {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Button("Retry") { Task { await vm.load() } }
                        .buttonStyle(.borderedProminent)
                        .tint(.palmPrimary)
                }
                .padding(.top, 80)
            } else if let m = vm.metrics {
                VStack(spacing: 16) {
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                    ], spacing: 12) {
                        MetricCard(title: "Agencies", value: "\(m.totalAgencies)", icon: "building.2.fill", color: .palmPrimary)
                        MetricCard(title: "Investors", value: "\(m.totalInvestors)", icon: "chart.line.uptrend.xyaxis", color: .purple)
                        MetricCard(title: "Emails Sent", value: "\(m.emailsSent)", icon: "envelope.fill", color: .blue)
                        MetricCard(title: "Calls Made", value: "\(m.callsMade)", icon: "phone.fill", color: .green)
                    }
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Outreach Progress")
                            .font(.headline)
                            .padding(.horizontal)

                        if m.totalAgencies > 0 {
                            ProgressRow(
                                label: "Agency Calls",
                                current: m.callsMade,
                                total: m.totalAgencies,
                                color: .green
                            )
                        }
                        if m.totalAgencies + m.totalInvestors > 0 {
                            ProgressRow(
                                label: "Email Outreach",
                                current: m.emailsSent,
                                total: (m.totalAgencies + m.totalInvestors) * 5,
                                color: .blue
                            )
                        }
                    }
                    .padding(.top, 8)
                }
                .padding(.vertical)
            }
        }
        .background(Color(UIColor.systemGroupedBackground))
        .navigationTitle("Analytics")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(color)
                Spacer()
            }
            HStack {
                Text(value)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.palmText)
                Spacer()
            }
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
    }
}

struct ProgressRow: View {
    let label: String
    let current: Int
    let total: Int
    let color: Color

    private var progress: Double {
        guard total > 0 else { return 0 }
        return min(Double(current) / Double(total), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(.subheadline.weight(.medium))
                Spacer()
                Text("\(current)/\(total)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color.opacity(0.15))
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: geo.size.width * progress, height: 8)
                }
            }
            .frame(height: 8)
        }
        .padding(.horizontal)
    }
}
