import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedTab = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selectedTab {
                case 0:
                    HomeView(onNavigateToRecord: { selectedTab = 2 })
                case 1:
                    ClientsView()
                case 2:
                    RecordView()
                case 3:
                    WorkspaceView()
                case 4:
                    SettingsView()
                default:
                    HomeView(onNavigateToRecord: { selectedTab = 2 })
                }
            }
            .padding(.bottom, 60)

            CustomTabBar(selectedTab: $selectedTab)
        }
        .edgesIgnoringSafeArea(.bottom)
        .environmentObject(api)
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: Int

    private let tabs: [(icon: String, label: String)] = [
        ("house.fill", "Home"),
        ("person.2.fill", "Clients"),
        ("mic.fill", "Palm It"),
        ("square.grid.2x2.fill", "Workspace"),
        ("gearshape.fill", "Settings"),
    ]

    var body: some View {
        HStack {
            ForEach(0..<tabs.count, id: \.self) { index in
                if index == 2 {
                    // Center "Palm It" button
                    VStack(spacing: 3) {
                        Button {
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
