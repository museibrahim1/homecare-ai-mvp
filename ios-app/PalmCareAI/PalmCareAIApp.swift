import SwiftUI

@main
struct PalmCareAIApp: App {
    @StateObject private var api = APIService.shared
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some Scene {
        WindowGroup {
            Group {
                if api.isAuthenticated {
                    MainTabView()
                        .environmentObject(api)
                } else if hasSeenOnboarding {
                    LoginView()
                        .environmentObject(api)
                } else {
                    LandingView()
                        .environmentObject(api)
                        .onDisappear { hasSeenOnboarding = true }
                }
            }
            .onChange(of: api.isAuthenticated) { authenticated in
                if authenticated {
                    hasSeenOnboarding = true
                }
            }
        }
    }
}
