import SwiftUI
import LocalAuthentication

struct SettingsView: View {
    @EnvironmentObject var api: APIService

    @State private var user: User?
    @State private var subscription: UserSubscription?
    @State private var showSubscription = false
    @State private var showLogoutConfirm = false
    @State private var showGoogleCalAuth = false
    @AppStorage("googleCalendarConnected") private var googleCalConnected = false

    @AppStorage("useFaceID") private var useFaceID = false
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("appTheme") private var appTheme = "Dark"

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    profileHeader
                    preferencesSection
                    accountSection
                    integrationsSection
                    billingSection
                    legalSection
                    logoutButton
                }
                .padding(.horizontal, 18)
                .padding(.top, 10)
                .padding(.bottom, 120)
            }
            .background(Color.palmBackground)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showSubscription) {
                SubscriptionView().environmentObject(api)
            }
            .sheet(isPresented: $showGoogleCalAuth) {
                GoogleCalendarSetupSheet(isConnected: $googleCalConnected)
                    .environmentObject(api)
            }
            .task { await loadData() }
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: 14) {
            let initials = (user?.full_name ?? "U")
                .split(separator: " ")
                .map { String($0.prefix(1)) }
                .joined()
                .uppercased()

            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.palmPrimary, Color.palmAccent],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 72, height: 72)
                .overlay(
                    Text(initials)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                )
                .shadow(color: Color.palmPrimary.opacity(0.3), radius: 8, y: 4)

            VStack(spacing: 4) {
                Text(user?.full_name ?? "Loading...")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.palmText)

                Text(user?.email ?? "")
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
            }

            Button {
                // Edit profile placeholder
            } label: {
                Text("Edit profile")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Color.palmPrimary.opacity(0.1))
                    .cornerRadius(16)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder, lineWidth: 1))
    }

    // MARK: - Preferences

    private var preferencesSection: some View {
        SettingsSection(title: "Preferences") {
            SettingsToggleRow(
                icon: "bell.fill",
                iconColor: .palmOrange,
                title: "Notifications & sounds",
                isOn: $notificationsEnabled
            )

            SettingsDivider()

            SettingsNavRow(icon: "globe", iconColor: .palmBlue, title: "Language", detail: "English")

            SettingsDivider()

            SettingsNavRow(icon: "paintbrush.fill", iconColor: .palmPurple, title: "Theme", detail: appTheme)
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        SettingsSection(title: "Account") {
            SettingsNavRow(icon: "lock.fill", iconColor: .palmSecondary, title: "Password")

            SettingsDivider()

            SettingsToggleRow(
                icon: "faceid",
                iconColor: .palmPrimary,
                title: "Login with Face ID",
                isOn: Binding(
                    get: { useFaceID },
                    set: { newValue in
                        if newValue {
                            authenticateBiometric { success in
                                useFaceID = success
                            }
                        } else {
                            useFaceID = false
                        }
                    }
                )
            )

            SettingsDivider()

            SettingsNavRow(icon: "questionmark.circle.fill", iconColor: .palmAccent, title: "Support")
        }
    }

    // MARK: - Billing

    private var billingSection: some View {
        SettingsSection(title: "Subscription & Billing") {
            Button { showSubscription = true } label: {
                HStack(spacing: 12) {
                    SettingsIcon(systemName: "creditcard.fill", color: .palmGreen)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Billing plan")
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                        Text(subscription?.plan_name ?? "Free")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmText)
                    }

                    Spacer()

                    Text("Manage")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.palmPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(Color.palmPrimary.opacity(0.1))
                        .cornerRadius(12)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }

            SettingsDivider()

            if let sub = subscription {
                HStack(spacing: 12) {
                    SettingsIcon(systemName: "chart.bar.fill", color: .palmBlue)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Usage this period")
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                        Text("\(sub.runs_used ?? 0) / \(sub.runs_limit ?? 0) runs")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmText)
                    }

                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
        }
    }

    // MARK: - Integrations

    private var integrationsSection: some View {
        SettingsSection(title: "Integrations") {
            Button { showGoogleCalAuth = true } label: {
                HStack(spacing: 12) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmBlue)
                        .frame(width: 32, height: 32)
                        .background(Color.palmBlue.opacity(0.1))
                        .cornerRadius(8)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Google Calendar")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.palmText)
                        Text(googleCalConnected ? "Connected" : "Not connected")
                            .font(.system(size: 11))
                            .foregroundColor(googleCalConnected ? .palmGreen : .palmSecondary)
                    }

                    Spacer()

                    Text(googleCalConnected ? "Manage" : "Connect")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(googleCalConnected ? .palmPrimary : .white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(
                            googleCalConnected
                                ? Color.palmPrimary.opacity(0.1)
                                : Color.palmPrimary
                        )
                        .cornerRadius(12)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
        }
    }

    // MARK: - Legal

    private var legalSection: some View {
        SettingsSection(title: "Legal") {
            SettingsNavRow(icon: "doc.plaintext", iconColor: .palmSecondary, title: "Terms and Privacy Policy")

            SettingsDivider()

            Button {
                URLCache.shared.removeAllCachedResponses()
            } label: {
                SettingsNavRow(icon: "trash.fill", iconColor: .palmSecondary, title: "Clear cache")
            }
        }
    }

    // MARK: - Logout

    private var logoutButton: some View {
        Button { showLogoutConfirm = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 15, weight: .semibold))
                Text("Logout")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundColor(.red)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.red.opacity(0.06))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.red.opacity(0.15), lineWidth: 1))
        }
        .alert("Log Out", isPresented: $showLogoutConfirm) {
            Button("Log Out", role: .destructive) { api.logout() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to log out?")
        }
    }

    // MARK: - Actions

    private func loadData() async {
        do { user = try await api.fetchUser() } catch {}
        do { subscription = try await api.fetchSubscription() } catch {}
    }

    private func authenticateBiometric(completion: @escaping (Bool) -> Void) {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false)
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Enable Face ID for quick login") { success, _ in
            DispatchQueue.main.async { completion(success) }
        }
    }
}

// MARK: - Reusable Settings Components

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmSecondary)
                .padding(.leading, 4)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content
            }
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
    }
}

struct SettingsNavRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    var detail: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            SettingsIcon(systemName: icon, color: iconColor)

            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmText)

            Spacer()

            if let detail = detail {
                Text(detail)
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmBorder)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

struct SettingsToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: 12) {
            SettingsIcon(systemName: icon, color: iconColor)

            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmText)

            Spacer()

            Toggle("", isOn: $isOn)
                .tint(.palmPrimary)
                .labelsHidden()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

struct SettingsIcon: View {
    let systemName: String
    let color: Color

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(color)
            .frame(width: 32, height: 32)
            .background(color.opacity(0.1))
            .cornerRadius(8)
    }
}

struct SettingsDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.palmBorder.opacity(0.5))
            .frame(height: 1)
            .padding(.leading, 58)
    }
}
