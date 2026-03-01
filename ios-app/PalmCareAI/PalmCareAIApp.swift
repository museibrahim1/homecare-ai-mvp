import SwiftUI

@main
struct PalmCareAIApp: App {
    @StateObject private var api = APIService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if api.isAuthenticated {
                    MainTabView()
                        .environmentObject(api)
                } else {
                    LandingView()
                        .environmentObject(api)
                }
            }
        }
    }
}
