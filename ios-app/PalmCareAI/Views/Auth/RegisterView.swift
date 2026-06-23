import SwiftUI

/// Simple, fast registration: full name + email + password.
///
/// We deliberately ask for as little as possible up front. Everything else
/// (agency address, phone, state, etc.) can be filled in later from Settings.
/// Backend auto-approves the account and returns an access token, so the
/// user is signed in the moment they tap "Create Account".
struct RegisterView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agencyName = ""

    @State private var showPassword = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showMagicLinkSent = false
    @State private var showConsent = false
    /// Shared with RecordView: accepting the agreements during sign-up also
    /// satisfies the in-app AI data-sharing consent, so users aren't asked
    /// twice. Required by App Store Review guideline 5.1.1(i)/5.1.2(i).
    @AppStorage("aiProcessingConsentAccepted") private var aiConsentAccepted = false
    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case fullName, email, password, agencyName
    }

    private var passwordIsStrong: Bool { password.count >= 8 }

    private var isEmailValid: Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.contains("@") && trimmed.contains(".") && trimmed.count > 5
    }

    private var formIsValid: Bool {
        !fullName.trimmingCharacters(in: .whitespaces).isEmpty
            && isEmailValid
            && passwordIsStrong
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                    .padding(.top, 8)
                    .padding(.bottom, 28)

                VStack(spacing: 14) {
                    nameField
                    emailField
                    passwordField
                    agencyField

                    createButton
                        .padding(.top, 8)

                    bottomLink
                        .padding(.top, 8)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(UIColor.systemBackground))
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
        .palmBackButton()
        .palmErrorAlert("Registration Failed", message: $errorMessage, isPresented: $showError)
        .alert("Check your email", isPresented: $showMagicLinkSent) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("If an account exists for that email, we just sent a one-tap sign-in link.")
        }
        .sheet(isPresented: $showConsent) {
            RegistrationConsentView(
                isSubmitting: $isLoading,
                onAgree: {
                    aiConsentAccepted = true
                    submitRegistration()
                },
                onCancel: {
                    showConsent = false
                }
            )
        }
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: 14) {
            PalmOrbLogo(size: 72, animated: true)
            VStack(spacing: 4) {
                Text("Get started in 30 seconds")
                    .font(.system(size: 22, weight: .bold))
                Text("Built for licensed home care agencies.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 24)
    }

    private var nameField: some View {
        roundedField(
            icon: "person",
            placeholder: "Your full name",
            text: $fullName,
            keyboard: .default,
            contentType: .name,
            focus: .fullName,
            next: .email
        )
    }

    private var emailField: some View {
        roundedField(
            icon: "envelope",
            placeholder: "Email",
            text: $email,
            keyboard: .emailAddress,
            contentType: .emailAddress,
            focus: .email,
            next: .password
        )
    }

    private var passwordField: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 12) {
                Image(systemName: "lock")
                    .font(.system(size: 17))
                    .foregroundColor(.secondary)
                    .frame(width: 22)

                Group {
                    if showPassword {
                        TextField("Password (at least 8 characters)", text: $password)
                            .textContentType(.newPassword)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField("Password (at least 8 characters)", text: $password)
                            .textContentType(.newPassword)
                    }
                }
                .font(.body)
                .focused($focusedField, equals: .password)
                .submitLabel(.next)
                .onSubmit { focusedField = .agencyName }

                Button { showPassword.toggle() } label: {
                    Image(systemName: showPassword ? "eye.slash" : "eye")
                        .font(.system(size: 17))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color(UIColor.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(focusedField == .password ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
            )

            if !password.isEmpty && !passwordIsStrong {
                Label("At least 8 characters", systemImage: "info.circle")
                    .font(.footnote)
                    .foregroundColor(.orange)
            }
        }
    }

    private var agencyField: some View {
        roundedField(
            icon: "building.2",
            placeholder: "Agency name (optional)",
            text: $agencyName,
            keyboard: .default,
            contentType: .organizationName,
            focus: .agencyName,
            next: nil
        )
    }

    private var createButton: some View {
        Button(action: { focusedField = nil; showConsent = true }) {
            ZStack {
                Text("Create Account")
                    .font(.headline)
                    .foregroundColor(.white)
                    .opacity(isLoading ? 0 : 1)
                if isLoading {
                    ProgressView().tint(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(formIsValid ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
            )
        }
        .disabled(!formIsValid || isLoading)
        .accessibilityIdentifier("createAccountButton")
    }

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Color.secondary.opacity(0.2)).frame(height: 1)
            Text("OR").font(.caption).foregroundColor(.secondary)
            Rectangle().fill(Color.secondary.opacity(0.2)).frame(height: 1)
        }
    }

    private var magicLinkButton: some View {
        Button(action: sendMagicLink) {
            HStack {
                Image(systemName: "envelope.badge")
                Text("Email me a sign-in link instead")
            }
            .font(.subheadline.weight(.medium))
            .foregroundColor(.palmPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.palmPrimary.opacity(0.4), lineWidth: 1)
            )
        }
        .disabled(!isEmailValid || isLoading)
        .opacity(isEmailValid ? 1 : 0.6)
    }

    private var bottomLink: some View {
        VStack(spacing: 14) {
            HStack(spacing: 4) {
                Text("Already have an account?")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Button { dismiss() } label: {
                    Text("Sign in")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmPrimary)
                }
            }
            VStack(spacing: 4) {
                Text("You'll review and agree to our policies in the next step.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                HStack(spacing: 4) {
                    Link("Terms of Service", destination: URL(string: "https://palmcareai.com/terms")!)
                        .font(.caption.weight(.semibold))
                    Text("and")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Link("Privacy Policy", destination: URL(string: "https://palmcareai.com/privacy")!)
                        .font(.caption.weight(.semibold))
                }
            }
            .multilineTextAlignment(.center)
            .padding(.horizontal, 8)
        }
    }

    // MARK: - Helpers

    private func roundedField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType,
        contentType: UITextContentType?,
        focus: Field,
        next: Field?
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 17))
                .foregroundColor(.secondary)
                .frame(width: 22)
            TextField(placeholder, text: text)
                .font(.body)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
                .submitLabel(next == nil ? .done : .next)
                .focused($focusedField, equals: focus)
                .onSubmit { focusedField = next }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focusedField == focus ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
    }

    /// Called only after the user has accepted the agreements on the consent
    /// step. Records that acceptance and creates the account.
    private func submitRegistration() {
        focusedField = nil
        isLoading = true
        errorMessage = nil

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let trimmedFullName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedAgency = agencyName.trimmingCharacters(in: .whitespacesAndNewlines)

        // Minimal payload — backend fills in defaults for everything optional.
        // accepted_terms records that the user agreed to ToS, Privacy Policy,
        // and AI data processing at sign-up.
        var body: [String: Any] = [
            "owner_email": trimmedEmail,
            "owner_password": password,
            "owner_name": trimmedFullName,
            "accepted_terms": true,
        ]
        if !trimmedAgency.isEmpty {
            body["name"] = trimmedAgency
        }

        Task {
            do {
                try await api.register(body: body)
                // register() now sets api.token automatically on success — the
                // app swaps to the main tab view, replacing this screen.
                await MainActor.run {
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    showConsent = false
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    private func sendMagicLink() {
        focusedField = nil
        isLoading = true
        errorMessage = nil

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        Task {
            do {
                try await api.requestMagicLink(email: trimmedEmail)
                await MainActor.run {
                    isLoading = false
                    showMagicLinkSent = true
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showError = true
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Registration Consent Step

/// Final step of sign-up: the user must review and agree to the Terms of
/// Service, Privacy Policy, and the AI data-processing disclosure before the
/// account is created. Required by App Store Review guideline 5.1.1(i)/5.1.2(i)
/// — consent is captured before any personal data can be sent to AI services.
struct RegistrationConsentView: View {
    @Binding var isSubmitting: Bool
    let onAgree: () -> Void
    let onCancel: () -> Void

    @State private var agreed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 34))
                            .foregroundColor(.palmPrimary)

                        Text("Review and agree")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.palmText)

                        Text("Before you create your account, please review how PALM handles your data and agree to our policies.")
                            .font(.system(size: 14))
                            .foregroundColor(.palmSecondary)
                            .lineSpacing(3)
                    }

                    policyRow(
                        icon: "doc.plaintext.fill",
                        title: "Terms of Service",
                        body: "The rules for using PALM, including your responsibilities and acceptable use.",
                        linkTitle: "Read the Terms of Service",
                        url: "https://palmcareai.com/terms"
                    )

                    policyRow(
                        icon: "hand.raised.fill",
                        title: "Privacy Policy",
                        body: "What data we collect, how we use it, how long we keep it, and your rights.",
                        linkTitle: "Read the Privacy Policy",
                        url: "https://palmcareai.com/privacy"
                    )

                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .top, spacing: 14) {
                            Image(systemName: "cpu.fill")
                                .font(.system(size: 18))
                                .foregroundColor(.palmPrimary)
                                .frame(width: 26)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("AI Data Processing")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.palmText)
                                Text("To turn recordings into transcripts and documents, PALM sends your visit audio and transcripts (which may include personal and health information) to third-party AI providers:")
                                    .font(.system(size: 13))
                                    .foregroundColor(.palmSecondary)
                                    .lineSpacing(3)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            bullet("Deepgram — converts speech to text and identifies speakers. Does not retain your audio after processing or use it to train models.")
                            bullet("Anthropic (Claude) — generates visit notes, billable items, and service agreements from the transcript. Does not use your data to train models.")
                            bullet("Data is encrypted in transit and at rest. These providers are bound by agreements requiring protection equal to our own. Your data is never sold or used for advertising.")
                        }
                        .padding(.leading, 40)
                    }

                    Text("You are responsible for obtaining any consent required from the individuals whose information you record.")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                        .lineSpacing(2)
                        .fixedSize(horizontal: false, vertical: true)

                    Button(action: { agreed.toggle() }) {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: agreed ? "checkmark.square.fill" : "square")
                                .font(.system(size: 22))
                                .foregroundColor(agreed ? .palmPrimary : .palmSecondary)
                            Text("I have read and agree to the Terms of Service, the Privacy Policy, and the AI data processing described above.")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.palmText)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(agreed ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
                        )
                    }
                    .buttonStyle(.plain)

                    Button(action: onAgree) {
                        ZStack {
                            Text("Agree and Create Account")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .opacity(isSubmitting ? 0 : 1)
                            if isSubmitting {
                                ProgressView().tint(.white)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(
                            LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                           startPoint: .leading, endPoint: .trailing)
                                .opacity(agreed && !isSubmitting ? 1 : 0.4)
                        )
                        .cornerRadius(12)
                    }
                    .disabled(!agreed || isSubmitting)
                }
                .padding(.horizontal, 22)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
            .background(Color.palmBackground)
            .navigationTitle("Almost done")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel", action: onCancel)
                        .disabled(isSubmitting)
                }
            }
            .interactiveDismissDisabled(isSubmitting)
        }
    }

    private func policyRow(icon: String, title: String, body: String, linkTitle: String, url: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.palmPrimary)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmText)
                Text(body)
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                Link(linkTitle, destination: URL(string: url)!)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
            }
        }
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(Color.palmPrimary)
                .frame(width: 5, height: 5)
                .padding(.top, 6)
            Text(text)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(APIService.shared)
    }
}
