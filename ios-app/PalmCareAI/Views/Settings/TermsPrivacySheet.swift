import SwiftUI

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

                        Text("Last updated: June 2026")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                    }

                    termsSection(
                        title: "1. Acceptance of Terms",
                        body: "By accessing or using PALM, you agree to be bound by these Terms of Service. If you do not agree, do not use the service."
                    )

                    termsSection(
                        title: "2. Service Description",
                        body: "PALM provides care documentation tools for home care organizations, including voice recording, transcription, service agreement generation, and client management."
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
                        title: "5. HIPAA-Aligned Safeguards",
                        body: "PALM is designed with HIPAA-aligned administrative, physical, and technical safeguards for electronic protected health information (ePHI). A Business Associate Agreement is available for covered entities."
                    )

                    termsSection(
                        title: "6. Beta Access",
                        body: "PALM is currently free during the beta evaluation period. There are no in-app purchases. Certain features may require a paid plan in the future; you will be notified before any charges apply."
                    )

                    termsSection(
                        title: "7. Limitation of Liability",
                        body: "PALM is provided \"as is\" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service."
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
                        body: "For questions about these terms or your privacy, contact us at support@palmcareai.com"
                    )

                    VStack(alignment: .leading, spacing: 10) {
                        Link("View full Terms of Service", destination: URL(string: "https://palmcareai.com/legal/terms")!)
                            .font(.system(size: 14, weight: .semibold))
                        Link("View full Privacy Policy", destination: URL(string: "https://palmcareai.com/legal/privacy")!)
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .padding(.top, 8)
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

