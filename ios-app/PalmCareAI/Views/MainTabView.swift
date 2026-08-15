import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedTab = ProcessInfo.processInfo.arguments.contains("OPEN_RECORD_TAB") ? 2 : 0
    @State private var navigationResetIds: [Int: UUID] = [
        0: UUID(), 1: UUID(), 2: UUID(), 3: UUID(), 4: UUID()
    ]
    @AppStorage("hasSeenSampleVisit") private var hasSeenSampleVisit = false
    @State private var showSamplePacket = false
    @State private var showPostWowPaywall = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // The mobile app is the caregiver-facing product. Admin tools
            // (Command Center, Sales Leads, Investors, Analytics) live only in
            // the web app, so the phone always uses the normal layout.
            normalContent
                .padding(.bottom, 88)

            CustomTabBar(
                selectedTab: $selectedTab,
                onTabReselected: { tab in
                    navigationResetIds[tab] = UUID()
                }
            )
            .padding(.horizontal, 24)
            .padding(.bottom, 18)
        }
        .edgesIgnoringSafeArea(.bottom)
        .onChange(of: selectedTab) { newTab in
            PostHogService.shared.capture("tab_selected", properties: [
                "tab_index": newTab,
            ])
        }
        .onAppear {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("AUTOMATION_STRESS_FLOW") {
                hasSeenSampleVisit = true
                return
            }
            #endif
            if !hasSeenSampleVisit {
                // Slight delay so Home paints first, then the wow lands.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    showSamplePacket = true
                }
            }
        }
        .fullScreenCover(isPresented: $showSamplePacket, onDismiss: {
            hasSeenSampleVisit = true
            PostHogService.shared.capture("sample_packet_dismissed")
            // Soft plan ask after the wow, not before.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                showPostWowPaywall = true
            }
        }) {
            SamplePacketView {
                showSamplePacket = false
            }
        }
        .sheet(isPresented: $showPostWowPaywall) {
            PaywallView()
                .environmentObject(api)
        }
    }

    // MARK: - Caregiver Layout
    // Tabs: Home, Clients, Palm It, Workspace, Settings

    @ViewBuilder
    private var normalContent: some View {
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
            WorkspaceView()
                .environmentObject(api)
                .id(navigationResetIds[3])
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
}

// MARK: - Custom Tab Bar

struct CustomTabBar: View {
    @EnvironmentObject var session: AssessmentSession
    @Binding var selectedTab: Int
    var onTabReselected: ((Int) -> Void)?

    private let tabs: [(icon: String, label: String)] = [
        ("house.fill", "Home"),
        ("person.2.fill", "Clients"),
        ("mic.fill", "Palm It"),
        ("square.grid.2x2.fill", "Workspace"),
        ("gearshape.fill", "Settings"),
    ]

    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            ForEach(0..<tabs.count, id: \.self) { index in
                if index == 2 {
                    palmItButton(index: index)
                } else {
                    standardTabButton(index: index)
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(height: 64)
        .background(
            Capsule(style: .continuous)
                .fill(Color.white.opacity(0.62))
                .background(.ultraThinMaterial, in: Capsule(style: .continuous))
                .overlay(
                    Capsule(style: .continuous)
                        .stroke(Color.white.opacity(0.92), lineWidth: 1)
                )
                .shadow(color: PalmGlass.shadow, radius: 20, y: 12)
        )
    }

    private func palmItButton(index: Int) -> some View {
        let isRecording = session.recorder.isRecording
        // Red while recording (acts as a stop button); brand orb otherwise.
        return Button {
            if isRecording {
                selectedTab = index
                session.stopRecording(client: nil)
            } else {
                if selectedTab == index {
                    onTabReselected?(index)
                }
                selectedTab = index
            }
        } label: {
            ZStack {
                if isRecording {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.red, .red.opacity(0.85)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 48, height: 48)
                        .shadow(color: Color.red.opacity(0.35), radius: 8, y: 2)
                    Image(systemName: "stop.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                } else {
                    PalmOrbLogo(size: 48)
                        .shadow(color: Color.palmPrimary.opacity(0.28), radius: 8, y: 2)
                }
            }
            .frame(maxWidth: .infinity)
            .offset(y: -6)
        }
        .accessibilityLabel(isRecording ? "Stop recording" : "Record assessment")
    }

    private func standardTabButton(index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            if selectedTab == index {
                onTabReselected?(index)
            }
            selectedTab = index
        } label: {
            Image(systemName: tabs[index].icon)
                .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                .foregroundColor(isSelected ? .palmPrimary : Color.palmText.opacity(0.45))
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(isSelected ? Color.palmPrimary.opacity(0.12) : Color.clear)
                )
                .frame(maxWidth: .infinity)
        }
        .accessibilityLabel("\(tabs[index].label) tab")
    }
}

#Preview {
    MainTabView()
        .environmentObject(APIService.shared)
        .environmentObject(AssessmentSession(api: APIService.shared))
}
