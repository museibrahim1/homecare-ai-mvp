import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedTab = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                HomeView()
                    .tag(0)

                ClientsView()
                    .tag(1)

                RecordView()
                    .tag(2)

                CalendarPlaceholderView()
                    .tag(3)

                MoreView()
                    .tag(4)
            }

            // Custom tab bar
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
        ("mic.fill", "Record"),
        ("calendar", "Calendar"),
        ("square.grid.2x2.fill", "More"),
    ]

    var body: some View {
        HStack {
            ForEach(0..<tabs.count, id: \.self) { index in
                if index == 2 {
                    // Prominent record button
                    Button {
                        selectedTab = index
                    } label: {
                        ZStack {
                            Circle()
                                .fill(LinearGradient.palmPrimary)
                                .frame(width: 56, height: 56)
                                .shadow(color: Color.palmPrimary.opacity(0.4), radius: 10, y: 4)

                            Image(systemName: tabs[index].icon)
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .offset(y: -16)
                    }
                } else {
                    Button {
                        selectedTab = index
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: tabs[index].icon)
                                .font(.system(size: 20))
                                .foregroundColor(
                                    selectedTab == index ? .palmPrimary : .palmSecondary
                                )

                            Text(tabs[index].label)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(
                                    selectedTab == index ? .palmPrimary : .palmSecondary
                                )
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)
        .padding(.bottom, 24)
        .background(
            Rectangle()
                .fill(.white)
                .shadow(color: .black.opacity(0.08), radius: 12, y: -4)
        )
    }
}

// MARK: - Placeholder Views

struct CalendarPlaceholderView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "calendar")
                    .font(.system(size: 48))
                    .foregroundColor(.palmPrimary.opacity(0.4))

                Text("Calendar")
                    .font(.title2.weight(.semibold))
                    .foregroundColor(.palmText)

                Text("Coming soon")
                    .font(.subheadline)
                    .foregroundColor(.palmSecondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.palmBackground)
            .navigationTitle("Calendar")
        }
    }
}

struct MoreView: View {
    @EnvironmentObject var api: APIService

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        Text("Profile Settings")
                    } label: {
                        Label("Profile", systemImage: "person.circle")
                    }

                    NavigationLink {
                        Text("Notification Settings")
                    } label: {
                        Label("Notifications", systemImage: "bell")
                    }

                    NavigationLink {
                        Text("Help & Support")
                    } label: {
                        Label("Help & Support", systemImage: "questionmark.circle")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        api.logout()
                    } label: {
                        Label("Log Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(APIService.shared)
}
