import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedTab = 0
    @State private var navigationResetIds: [Int: UUID] = [
        0: UUID(), 1: UUID(), 2: UUID(), 3: UUID(), 4: UUID()
    ]
    @State private var currentUser: User?

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selectedTab {
                case 0:
                    NavigationStack {
                        HomeView(onNavigateToRecord: { selectedTab = 2 })
                            .environmentObject(api)
                    }
                    .id(navigationResetIds[0])
                case 1:
                    NavigationStack {
                        ClientsView()
                            .environmentObject(api)
                    }
                    .id(navigationResetIds[1])
                case 2:
                    NavigationStack {
                        RecordView()
                            .environmentObject(api)
                    }
                    .id(navigationResetIds[2])
                case 3:
                    if let user = currentUser, user.isAdmin {
                        AdminHubView(user: user)
                            .environmentObject(api)
                            .id(navigationResetIds[3])
                    } else {
                        WorkspaceView()
                            .environmentObject(api)
                            .id(navigationResetIds[3])
                    }
                case 4:
                    NavigationStack {
                        SettingsView()
                            .environmentObject(api)
                    }
                    .id(navigationResetIds[4])
                default:
                    NavigationStack {
                        HomeView(onNavigateToRecord: { selectedTab = 2 })
                            .environmentObject(api)
                    }
                    .id(navigationResetIds[0])
                }
            }
            .padding(.bottom, 60)

            CustomTabBar(
                selectedTab: $selectedTab,
                isAdmin: currentUser?.isAdmin ?? false,
                onTabReselected: { tab in
                    navigationResetIds[tab] = UUID()
                }
            )
        }
        .edgesIgnoringSafeArea(.bottom)
        .task {
            do {
                currentUser = try await api.fetchUser()
            } catch { /* non-critical */ }
        }
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: Int
    var isAdmin: Bool = false
    var onTabReselected: ((Int) -> Void)?

    private var tabs: [(icon: String, label: String)] {
        [
            ("house.fill", "Home"),
            ("person.2.fill", "Clients"),
            ("mic.fill", "Palm It"),
            (isAdmin ? "shield.fill" : "square.grid.2x2.fill", isAdmin ? "Admin" : "Workspace"),
            ("gearshape.fill", "Settings"),
        ]
    }

    var body: some View {
        HStack {
            ForEach(0..<tabs.count, id: \.self) { index in
                if index == 2 {
                    VStack(spacing: 3) {
                        Button {
                            if selectedTab == index {
                                onTabReselected?(index)
                            }
                            selectedTab = index
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(
                                        selectedTab == 2
                                            ? LinearGradient(colors: [.red, .red.opacity(0.85)], startPoint: .topLeading, endPoint: .bottomTrailing)
                                            : LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing)
                                    )
                                    .frame(width: 50, height: 50)
                                    .shadow(
                                        color: (selectedTab == 2 ? Color.red : Color.palmPrimary).opacity(0.45),
                                        radius: 7, y: 3
                                    )

                                Image(systemName: tabs[index].icon)
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                        }
                        .accessibilityLabel("Record assessment")
                        .offset(y: -20)

                        Text(tabs[index].label)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.palmSecondary)
                            .offset(y: -17)
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    Button {
                        if selectedTab == index {
                            onTabReselected?(index)
                        }
                        selectedTab = index
                    } label: {
                        VStack(spacing: 3) {
                            Image(systemName: tabs[index].icon)
                                .font(.system(size: 20))
                                .foregroundColor(
                                    selectedTab == index ? .palmPrimary : .palmSecondary
                                )

                            Text(tabs[index].label)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(
                                    selectedTab == index ? .palmPrimary : .palmSecondary
                                )
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .accessibilityLabel("\(tabs[index].label) tab")
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 6)
        .padding(.bottom, 24)
        .background(
            Rectangle()
                .fill(Color(UIColor.systemBackground))
                .shadow(color: .black.opacity(0.06), radius: 8, y: -4)
                .overlay(
                    Rectangle().fill(Color.palmBorder.opacity(0.5)).frame(height: 1),
                    alignment: .top
                )
        )
    }
}

// CalendarPlaceholderView and MoreView removed — replaced by CalendarView and SettingsView

#Preview {
    MainTabView()
        .environmentObject(APIService.shared)
}
