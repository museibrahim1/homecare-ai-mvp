import SwiftUI
import LocalAuthentication

struct SettingsView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.openURL) private var openURL

    @State private var user: User?
    @State private var usage: UserSubscription?
    @State private var loadFailed = false
    @State private var showLogoutConfirm = false
    @State private var showGoogleCalAuth = false
    @State private var showPasswordChange = false
    @State private var showTerms = false
    @State private var showEditProfile = false
    @State private var showDeleteAccount = false
    @AppStorage("googleCalendarConnected") private var googleCalConnected = false

    @AppStorage("useFaceID") private var useFaceID = false
    @AppStorage("backgroundRecording") private var backgroundRecording = false
    @AppStorage("isDarkMode") private var isDarkMode = false
    @State private var faceIDError: String?
    @State private var cacheCleared = false

    @StateObject private var emailConnector = EmailSenderConnector()
    @State private var emailSender: EmailSenderStatus?
    @State private var showDisconnectEmail = false
    @State private var emailSenderError: String?

    var body: some View {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    if loadFailed { loadErrorBanner }
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

    // MARK: - Load Error

    private var loadErrorBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmOrange)

            Text("Couldn't load your profile")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.palmText)

            Spacer()

            Button {
                Task { await loadData() }
            } label: {
                Text("Retry")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.palmPrimary)
                    .cornerRadius(12)
            }
            .accessibilityLabel("Retry loading profile")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.palmOrange.opacity(0.08))
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmOrange.opacity(0.25), lineWidth: 1))
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
                            authenticateBiometric { success, message in
                                useFaceID = success
                                if !success { faceIDError = message }
                            }
                        } else {
                            useFaceID = false
                        }
                    }
                )
            )
            .alert("Face ID", isPresented: Binding(
                get: { faceIDError != nil },
                set: { if !$0 { faceIDError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(faceIDError ?? "")
            }

            SettingsDivider()

            Button {
                if let url = URL(string: "mailto:support@palmcareai.com?subject=PALM%20Support") {
                    openURL(url)
                }
            } label: {
                SettingsNavRow(icon: "questionmark.circle.fill", iconColor: .palmAccent, title: "Support", detail: "support@palmcareai.com")
            }
            .accessibilityLabel("Contact support")
        }
    }

    // MARK: - Plan
    // During the TestFlight beta everything is unlocked and free — pricing
    // comes later from real usage data, so there is no billing UI to manage.

    private var billingSection: some View {
        SettingsSection(title: "Your Plan") {
            HStack(spacing: 12) {
                SettingsIcon(systemName: "sparkles", color: .palmGreen)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Beta access")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmText)
                    Text("Everything unlocked — free during the beta")
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                }

                Spacer()

                Text("FREE")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(.palmGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.palmGreen.opacity(0.12))
                    .cornerRadius(10)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)

            if let usage {
                SettingsDivider()

                HStack(spacing: 12) {
                    SettingsIcon(systemName: "chart.bar.fill", color: .palmBlue)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Assessments completed")
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                        Text("\(usage.total_assessments ?? 0)")
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
                withAnimation { cacheCleared = true }
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation { cacheCleared = false }
                }
            } label: {
                SettingsNavRow(
                    icon: cacheCleared ? "checkmark.circle.fill" : "trash.fill",
                    iconColor: cacheCleared ? .palmGreen : .palmSecondary,
                    title: cacheCleared ? "Cache cleared" : "Clear cache"
                )
            }
            .disabled(cacheCleared)
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
        loadFailed = false
        do {
            user = try await api.fetchUser()
        } catch {
            // Without the profile the header is stuck on "Loading..." — give
            // the user a retry instead of a silent dead screen.
            loadFailed = true
        }
        usage = try? await api.fetchUsage()
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

    private func authenticateBiometric(completion: @escaping (Bool, String?) -> Void) {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false, "Face ID isn't available on this device. Make sure it's set up in the iPhone Settings app.")
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Enable Face ID for quick login") { success, evalError in
            DispatchQueue.main.async {
                if success {
                    completion(true, nil)
                } else if let laError = evalError as? LAError, laError.code == .userCancel {
                    completion(false, nil)
                } else {
                    completion(false, "Face ID verification didn't complete. Please try again.")
                }
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(APIService())
}
