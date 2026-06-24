import Foundation
import UIKit
import UserNotifications

/// Receives the APNs device token and forwards it to the backend so we can send
/// lifecycle / reminder pushes. Registration is tied to auth: the token is
/// persisted locally and (re)sent whenever the user is signed in.
final class AppDelegate: NSObject, UIApplicationDelegate {
    private static let tokenKey = "apnsDeviceToken"

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(hex, forKey: Self.tokenKey)
        Task { await APIService.shared.registerStoredDeviceTokenIfPossible() }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        #if DEBUG
        print("Push registration failed: \(error.localizedDescription)")
        #endif
    }
}

enum PushManager {
    static let tokenKey = "apnsDeviceToken"

    /// Ask for notification permission and, if granted, register with APNs.
    /// Call this once the user is authenticated.
    static func requestAuthorizationAndRegister() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }
}

extension APIService {
    /// POST the stored APNs token to the backend (no-op if missing or signed out).
    func registerStoredDeviceTokenIfPossible() async {
        guard token != nil,
              let deviceToken = UserDefaults.standard.string(forKey: PushManager.tokenKey),
              !deviceToken.isEmpty else { return }
        do {
            try await requestVoid("POST", path: "/notifications/register-device", body: [
                "token": deviceToken,
                "platform": "ios",
            ])
        } catch {
            #if DEBUG
            print("Device token registration failed: \(error.localizedDescription)")
            #endif
        }
    }
}
