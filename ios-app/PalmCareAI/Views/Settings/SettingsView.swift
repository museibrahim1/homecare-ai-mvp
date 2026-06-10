import SwiftUI
import LocalAuthentication

struct SettingsView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.openURL) private var openURL

    @State private var user: User?
    @State private var subscription: SubscriptionResponse?
    @State private var showSubscription = false
    @State private var showLogoutConfirm = false
    @State private var showGoogleCalAuth = false
    @State private var showPasswordChange = false
    @State private var showTerms = false
    @State private var showEditProfile = false
    @State private var showDeleteAccount = false
    @AppStorage("googleCalendarConnected") private var googleCalConnected = false

    @AppStorage("useFaceID") private var useFaceID = false
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("backgroundRecording") private var backgroundRecording = false
    @AppStorage("isDarkMode") private var isDarkMode = false

    @StateObject private var emailConnector = EmailSenderConnector()
    @State private var emailSender: EmailSenderStatus?
    @State private var showDisconnectEmail = false
    @State private var emailSenderError: String?

    var body: some View {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    profileHeader
                    preferencesSection
                    accountSection
                    integrationsSection
                    billingSection
                    legalSection
                    logoutButton
                    dangerZoneSection
                }
                .padding(.horizontal, 18)
                .padding(.top, 10)
                .padding(.bottom, 120)
            }
            .background(Color.palmBackground)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showSubscription) {
                SubscriptionView(showLimitBanner: false).environmentObject(api)
            }
            .sheet(isPresented: $showGoogleCalAuth) {
                GoogleCalendarSetupSheet(isConnected: $googleCalConnected)
                    .environmentObject(api)
            }
            .sheet(isPresented: $showPasswordChange) {
                ChangePasswordSheet().environmentObject(api)
            }
            .sheet(isPresented: $showTerms) {
                TermsPrivacySheet()
            }
            .sheet(isPresented: $showEditProfile) {
                EditProfileSheet(user: user).environmentObject(api)
            }
            .sheet(isPresented: $showDeleteAccount) {
                DeleteAccountSheet().environmentObject(api)
            }
            .task { await loadData() }
            .preferredColorScheme(isDarkMode ? .dark : .light)
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
                showEditProfile = true
            } label: {
                Text("Edit profile")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Color.palmPrimary.opacity(0.1))
                    .cornerRadius(16)
            }
            .accessibilityLabel("Edit profile")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color(UIColor.secondarySystemGroupedBackground))
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

            SettingsToggleRow(
                icon: "record.circle",
                iconColor: .red,
                title: "Background recording",
                isOn: $backgroundRecording
            )

            SettingsDivider()

            SettingsToggleRow(
                icon: "moon.fill",
                iconColor: .palmPurple,
                title: "Dark mode",
                isOn: $isDarkMode
            )
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        SettingsSection(title: "Account") {
            Button { showPasswordChange = true } label: {
                SettingsNavRow(icon: "lock.fill", iconColor: .palmSecondary, title: "Password")
            }
            .accessibilityLabel("Change password")

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

            Button {
                if let url = URL(string: "mailto:support@palmcareai.com?subject=PalmCare%20AI%20Support") {
                    openURL(url)
                }
            } label: {
                SettingsNavRow(icon: "questionmark.circle.fill", iconColor: .palmAccent, title: "Support", detail: "support@palmcareai.com")
            }
            .accessibilityLabel("Contact support")
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
                        Text(subscription?.plan?.name ?? "Free")
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
            .accessibilityLabel("Manage billing plan")

            SettingsDivider()

            if let sub = subscription {
                HStack(spacing: 12) {
                    SettingsIcon(systemName: "chart.bar.fill", color: .palmBlue)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Usage this period")
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                        Text("\(sub.subscription?.visits_this_month ?? 0) / \(sub.plan?.max_visits_per_month ?? 0) runs")
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
            .accessibilityLabel(googleCalConnected ? "Manage Google Calendar" : "Connect Google Calendar")

            SettingsDivider()

            businessEmailRow
        }
    }

    private var emailConnected: Bool { emailSender?.connected == true }

    private var businessEmailRow: some View {
        Button {
            if emailConnected {
                showDisconnectEmail = true
            } else {
                Task { await connectBusinessEmail() }
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                    .frame(width: 32, height: 32)
                    .background(Color.palmPrimary.opacity(0.1))
                    .cornerRadius(8)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Send-from email")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.palmText)
                    Text(emailConnected ? (emailSender?.address ?? "Connected") : "Send agreements from your business email")
                        .font(.system(size: 11))
                        .foregroundColor(emailConnected ? .palmGreen : .palmSecondary)
                        .lineLimit(1)
                }

                Spacer()

                if emailConnector.isConnecting {
                    ProgressView().scaleEffect(0.8)
                } else {
                    Text(emailConnected ? "Disconnect" : "Connect")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(emailConnected ? .red : .white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(emailConnected ? Color.red.opacity(0.1) : Color.palmPrimary)
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
        .disabled(emailConnector.isConnecting)
        .accessibilityLabel(emailConnected ? "Disconnect business email" : "Connect business email")
        .palmConfirmAlert(
            "Disconnect Email",
            message: "Stop sending agreements from \(emailSender?.address ?? "your business email")? You can reconnect anytime.",
            icon: "paperplane.fill",
            iconColor: .red,
            isPresented: $showDisconnectEmail,
            confirmTitle: "Disconnect",
            confirmStyle: .destructive,
            onConfirm: { Task { await disconnectBusinessEmail() } }
        )
        .alert("Business Email", isPresented: Binding(
            get: { emailSenderError != nil },
            set: { if !$0 { emailSenderError = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(emailSenderError ?? "")
        }
    }

    // MARK: - Legal

    private var legalSection: some View {
        SettingsSection(title: "Legal") {
            Button { showTerms = true } label: {
                SettingsNavRow(icon: "doc.plaintext", iconColor: .palmSecondary, title: "Terms and Privacy Policy")
            }
            .accessibilityLabel("Terms and Privacy Policy")

            SettingsDivider()

            Button {
                URLCache.shared.removeAllCachedResponses()
            } label: {
                SettingsNavRow(icon: "trash.fill", iconColor: .palmSecondary, title: "Clear cache")
            }
            .accessibilityLabel("Clear cache")
        }
    }

    // MARK: - Danger Zone (Account Deletion)
    // App Store Review Guideline 5.1.1(v) requires an in-app account deletion path.

    private var dangerZoneSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Danger Zone")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.red.opacity(0.85))
                .padding(.leading, 4)

            Button { showDeleteAccount = true } label: {
                HStack(spacing: 12) {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.red)
                        .frame(width: 32, height: 32)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Delete account")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.red)
                        Text("Permanently remove your account and all data")
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.red.opacity(0.4))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
            .accessibilityLabel("Delete account permanently")
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.red.opacity(0.25), lineWidth: 1))
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
        .accessibilityLabel("Log out")
        .palmConfirmAlert(
            "Log Out",
            message: "Are you sure you want to log out?",
            icon: "arrow.right.square.fill",
            iconColor: .red,
            isPresented: $showLogoutConfirm,
            confirmTitle: "Log Out",
            confirmStyle: .destructive,
            onConfirm: { api.logout() }
        )
    }

    // MARK: - Actions

    private func loadData() async {
        async let fetchedUser = try api.fetchUser()
        async let fetchedSub = try api.fetchSubscription()
        user = try? await fetchedUser
        subscription = try? await fetchedSub
        emailSender = try? await api.emailSenderStatus()
        // Sync the cached calendar flag with the server so the row doesn't
        // keep saying "Connected" after a server-side disconnect/expiry.
        if let connected = try? await api.checkGoogleCalendarStatus() {
            googleCalConnected = connected
        }
    }

    private func connectBusinessEmail() async {
        emailSenderError = nil
        do {
            let status = try await emailConnector.connect(api: api)
            await MainActor.run { emailSender = status }
        } catch let e as EmailSenderConnector.ConnectError {
            if case .cancelled = e { return }
            await MainActor.run { emailSenderError = e.localizedDescription }
        } catch {
            await MainActor.run { emailSenderError = error.localizedDescription }
        }
    }

    private func disconnectBusinessEmail() async {
        do {
            try await api.disconnectEmailSender()
            await MainActor.run { emailSender = EmailSenderStatus(connected: false, address: nil, provider: nil) }
        } catch {
            await MainActor.run { emailSenderError = error.localizedDescription }
        }
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

#Preview {
    SettingsView()
        .environmentObject(APIService())
}
