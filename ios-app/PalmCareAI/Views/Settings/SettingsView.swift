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
    @AppStorage("googleCalendarConnected") private var googleCalConnected = false

    @AppStorage("useFaceID") private var useFaceID = false
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("backgroundRecording") private var backgroundRecording = false
    @AppStorage("isDarkMode") private var isDarkMode = false

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
            .sheet(isPresented: $showPasswordChange) {
                ChangePasswordSheet().environmentObject(api)
            }
            .sheet(isPresented: $showTerms) {
                TermsPrivacySheet()
            }
            .sheet(isPresented: $showEditProfile) {
                EditProfileSheet(user: user).environmentObject(api)
            }
            .task { await loadData() }
            .preferredColorScheme(isDarkMode ? .dark : .light)
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
                if let url = URL(string: "mailto:support@palmtai.com?subject=PalmCare%20AI%20Support") {
                    openURL(url)
                }
            } label: {
                SettingsNavRow(icon: "questionmark.circle.fill", iconColor: .palmAccent, title: "Support", detail: "support@palmtai.com")
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
            .background(Color(UIColor.secondarySystemGroupedBackground))
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
        .accessibilityLabel(title)
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

// MARK: - Change Password Sheet

struct ChangePasswordSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var success = false

    private var canSubmit: Bool {
        !currentPassword.isEmpty && newPassword.count >= 8 && newPassword == confirmPassword
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.palmPrimary.opacity(0.1))
                                .frame(width: 64, height: 64)
                            Image(systemName: "lock.rotation")
                                .font(.system(size: 26))
                                .foregroundColor(.palmPrimary)
                        }
                        Text("Change Password")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    .padding(.top, 8)

                    if success {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                            Text("Password updated successfully").font(.system(size: 14, weight: .medium)).foregroundColor(.green)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(Color.green.opacity(0.08))
                        .cornerRadius(12)
                    }

                    VStack(spacing: 14) {
                        passwordField("Current Password", text: $currentPassword)
                        passwordField("New Password", text: $newPassword)
                        passwordField("Confirm New Password", text: $confirmPassword)

                        if newPassword.count > 0 && newPassword.count < 8 {
                            Text("Password must be at least 8 characters")
                                .font(.system(size: 12))
                                .foregroundColor(.orange)
                        }

                        if !confirmPassword.isEmpty && newPassword != confirmPassword {
                            Text("Passwords don't match")
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                        }
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button { changePassword() } label: {
                        HStack {
                            if isLoading { ProgressView().tint(.white).scaleEffect(0.8) }
                            Text("Update Password")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canSubmit ? Color.palmPrimary : Color.palmSecondary.opacity(0.3))
                        .cornerRadius(12)
                    }
                    .disabled(!canSubmit || isLoading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func passwordField(_ placeholder: String, text: Binding<String>) -> some View {
        SecureField(placeholder, text: text)
            .font(.system(size: 14))
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.palmFieldBg)
            .cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
    }

    private func changePassword() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let _: [String: AnyCodable] = try await api.request(
                    "POST", path: "/auth/change-password",
                    body: ["current_password": currentPassword, "new_password": newPassword]
                )
                await MainActor.run {
                    isLoading = false
                    success = true
                    currentPassword = ""
                    newPassword = ""
                    confirmPassword = ""
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

// MARK: - Terms & Privacy Sheet

struct TermsPrivacySheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Terms of Service")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)

                        Text("Last updated: February 2026")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                    }

                    termsSection(
                        title: "1. Acceptance of Terms",
                        body: "By accessing or using PalmCare AI, you agree to be bound by these Terms of Service. If you do not agree, do not use the service."
                    )

                    termsSection(
                        title: "2. Service Description",
                        body: "PalmCare AI provides AI-powered care documentation tools including voice recording, transcription, contract generation, and client management for care professionals."
                    )

                    termsSection(
                        title: "3. User Responsibilities",
                        body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to use the service in compliance with all applicable laws including HIPAA regulations."
                    )

                    termsSection(
                        title: "4. Data Privacy",
                        body: "We take your privacy seriously. Client data and recordings are encrypted at rest and in transit. We do not sell or share your data with third parties. Audio recordings are processed for transcription and then stored securely."
                    )

                    termsSection(
                        title: "5. HIPAA Compliance",
                        body: "PalmCare AI is designed to support HIPAA compliance for healthcare providers. We implement administrative, physical, and technical safeguards to protect electronic protected health information (ePHI)."
                    )

                    termsSection(
                        title: "6. Subscription & Billing",
                        body: "Paid features require an active subscription. You may cancel at any time. Refunds are handled on a case-by-case basis within 30 days of purchase."
                    )

                    termsSection(
                        title: "7. Limitation of Liability",
                        body: "PalmCare AI is provided \"as is\" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service."
                    )

                    Divider().padding(.vertical, 8)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Privacy Policy")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }

                    termsSection(
                        title: "Information We Collect",
                        body: "We collect account information (name, email), client data you enter, audio recordings, and usage analytics. We use this data solely to provide and improve the service."
                    )

                    termsSection(
                        title: "Data Retention",
                        body: "Your data is retained as long as your account is active. Upon account deletion, all associated data is permanently removed within 30 days."
                    )

                    termsSection(
                        title: "Contact",
                        body: "For questions about these terms or your privacy, contact us at support@palmtai.com"
                    )
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
            .background(Color.palmBackground)
            .navigationTitle("Terms & Privacy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func termsSection(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmText)
            Text(body)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .lineSpacing(3)
        }
    }
}

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    var user: User?

    @State private var fullName = ""
    @State private var phone = ""
    @State private var isLoading = false
    @State private var success = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 12) {
                        let initials = fullName
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
                                Text(initials.isEmpty ? "U" : initials)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(.white)
                            )
                            .shadow(color: Color.palmPrimary.opacity(0.3), radius: 8, y: 4)

                        Text("Edit Profile")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    .padding(.top, 8)

                    if success {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                            Text("Profile updated!").font(.system(size: 14, weight: .medium)).foregroundColor(.green)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(Color.green.opacity(0.08))
                        .cornerRadius(12)
                    }

                    VStack(spacing: 14) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Full Name")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "person")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)
                                TextField("Your name", text: $fullName)
                                    .font(.system(size: 14))
                                    .textContentType(.name)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg)
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        }

                        VStack(alignment: .leading, spacing: 5) {
                            Text("Phone")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "phone")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)
                                TextField("(555) 123-4567", text: $phone)
                                    .font(.system(size: 14))
                                    .keyboardType(.phonePad)
                                    .textContentType(.telephoneNumber)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg)
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1.5))
                        }

                        VStack(alignment: .leading, spacing: 5) {
                            Text("Email")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmTextMuted)

                            HStack(spacing: 10) {
                                Image(systemName: "envelope")
                                    .font(.system(size: 15))
                                    .foregroundColor(.palmSecondary)
                                    .frame(width: 20)
                                Text(user?.email ?? "")
                                    .font(.system(size: 14))
                                    .foregroundColor(.palmSecondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.palmFieldBg.opacity(0.5))
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder.opacity(0.5), lineWidth: 1.5))
                        }
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button { saveProfile() } label: {
                        HStack {
                            if isLoading { ProgressView().tint(.white).scaleEffect(0.8) }
                            Text("Save Changes")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(fullName.isEmpty ? Color.palmSecondary.opacity(0.3) : Color.palmPrimary)
                        .cornerRadius(12)
                    }
                    .disabled(fullName.isEmpty || isLoading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear {
                fullName = user?.full_name ?? ""
                phone = user?.phone ?? ""
            }
        }
    }

    private func saveProfile() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                var body: [String: Any] = ["owner_name": fullName]
                if !phone.isEmpty { body["phone"] = phone }
                _ = try await api.updateProfile(body: body)
                await MainActor.run {
                    isLoading = false
                    withAnimation { success = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { dismiss() }
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(APIService())
}
