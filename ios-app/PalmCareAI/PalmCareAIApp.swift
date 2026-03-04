import SwiftUI
import LocalAuthentication

@main
struct PalmCareAIApp: App {
    @StateObject private var api = APIService.shared
    @AppStorage("useFaceID") private var useFaceID = false
    @AppStorage("isDarkMode") private var isDarkMode = false
    @State private var isBiometricUnlocked = false

    init() {
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = UIColor.white
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        ]
        navAppearance.shadowColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)

        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        UINavigationBar.appearance().tintColor = UIColor(red: 13/255, green: 148/255, blue: 136/255, alpha: 1)
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if api.isAuthenticated {
                    if useFaceID && !isBiometricUnlocked {
                        FaceIDLockScreen(onUnlock: { isBiometricUnlocked = true })
                            .environmentObject(api)
                    } else {
                        MainTabView()
                            .environmentObject(api)
                    }
                } else {
                    LandingView()
                        .environmentObject(api)
                }
            }
            .onChange(of: api.isAuthenticated) { newValue in
                if !newValue { isBiometricUnlocked = false }
            }
            .preferredColorScheme(isDarkMode ? .dark : .light)
        }
    }
}

struct FaceIDLockScreen: View {
    let onUnlock: () -> Void
    @EnvironmentObject var api: APIService
    @State private var isAuthenticating = false
    @State private var authFailed = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.palmPrimary.opacity(0.1))
                    .frame(width: 100, height: 100)

                Image(systemName: "faceid")
                    .font(.system(size: 44))
                    .foregroundColor(.palmPrimary)
            }

            VStack(spacing: 6) {
                Text("PalmCare AI")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.palmText)

                Text("Authenticate to continue")
                    .font(.system(size: 14))
                    .foregroundColor(.palmSecondary)
            }

            if authFailed {
                Text("Authentication failed. Try again.")
                    .font(.system(size: 13))
                    .foregroundColor(.red)
            }

            Button { authenticate() } label: {
                HStack(spacing: 8) {
                    Image(systemName: "faceid")
                        .font(.system(size: 16, weight: .semibold))
                    Text(isAuthenticating ? "Authenticating..." : "Unlock with Face ID")
                        .font(.system(size: 15, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600], startPoint: .leading, endPoint: .trailing))
                .cornerRadius(12)
            }
            .disabled(isAuthenticating)
            .padding(.horizontal, 40)

            Button {
                api.logout()
            } label: {
                Text("Use a different account")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmSecondary)
            }

            Spacer()
        }
        .background(Color.palmBackground)
        .onAppear { authenticate() }
    }

    private func authenticate() {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            onUnlock()
            return
        }

        isAuthenticating = true
        authFailed = false

        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock PalmCare AI") { success, _ in
            DispatchQueue.main.async {
                isAuthenticating = false
                if success {
                    onUnlock()
                } else {
                    authFailed = true
                }
            }
        }
    }
}
