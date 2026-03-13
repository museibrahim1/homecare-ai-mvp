import SwiftUI

struct AdminHubView: View {
    let user: User

    private var tools: [(String, String, String, Color)] {
        var result: [(String, String, String, Color)] = []
        if user.hasPermission("command_center") {
            result.append(("Command Center", "paperplane.fill", "command_center", .palmPrimary))
        }
        if user.hasPermission("sales_leads") {
            result.append(("Sales Leads", "target", "sales_leads", .orange))
        }
        if user.hasPermission("investors") {
            result.append(("Investors", "chart.line.uptrend.xyaxis", "investors", .purple))
        }
        if user.hasPermission("analytics") {
            result.append(("Analytics", "chart.bar.fill", "analytics", .blue))
        }
        return result
    }

    @State private var selectedTool: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerSection

                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 16),
                        GridItem(.flexible(), spacing: 16),
                    ], spacing: 16) {
                        ForEach(tools, id: \.2) { tool in
                            NavigationLink(value: tool.2) {
                                AdminToolCard(title: tool.0, icon: tool.1, color: tool.3)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 40)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Admin")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: String.self) { toolId in
                switch toolId {
                case "command_center": CommandCenterView()
                case "sales_leads": SalesLeadsView()
                case "investors": InvestorsView()
                case "analytics": AnalyticsDashView()
                default: Text("Unknown")
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Welcome back")
                        .font(.subheadline)
                        .foregroundColor(.palmSecondary)
                    Text(user.full_name)
                        .font(.title2.bold())
                        .foregroundColor(.palmText)
                }
                Spacer()
                Circle()
                    .fill(LinearGradient.palmButton)
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(String(user.full_name.prefix(1)))
                            .font(.headline.bold())
                            .foregroundColor(.white)
                    )
            }
            .padding(.horizontal)
            .padding(.top, 12)
        }
    }
}

struct AdminToolCard: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.12))
                    .frame(width: 56, height: 56)
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
            }
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.palmText)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}

#Preview {
    AdminHubView(user: User(
        id: "1", email: "ceo@palmtai.com", full_name: "Muse Ibrahim",
        role: "admin", phone: nil, is_active: true,
        created_at: nil, updated_at: nil, permissions: nil, temp_password: nil
    ))
}
