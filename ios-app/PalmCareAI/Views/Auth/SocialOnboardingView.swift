import SwiftUI

/// Agency name + consent after social signup (User exists, no Business yet).
struct SocialOnboardingView: View {
    @EnvironmentObject var api: APIService
    @AppStorage("aiProcessingConsentAccepted") private var aiConsentAccepted = false

    @State private var agencyName = ""
    @State private var showConsent = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    PalmOrbLogo(size: 72, animated: true)
                        .padding(.top, 24)

                    VStack(spacing: 8) {
                        Text("Set up your agency")
                            .font(.system(size: 26, weight: .bold))
                        Text("One more step before you start documenting visits.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Agency name")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.secondary)
                        TextField("e.g. Sunrise Home Care", text: $agencyName)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .background(Color(UIColor.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .padding(.horizontal, 24)

                    Button {
                        showConsent = true
                    } label: {
                        Text(isLoading ? "Saving…" : "Continue")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.palmPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .disabled(isLoading)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
            .background(Color(UIColor.systemBackground))
            .navigationBarHidden(true)
            .sheet(isPresented: $showConsent) {
                RegistrationConsentView(
                    isSubmitting: $isLoading,
                    onAgree: {
                        aiConsentAccepted = true
                        showConsent = false
                        Task { await submit() }
                    },
                    onCancel: { showConsent = false }
                )
            }
            .palmErrorAlert("Setup Failed", message: $errorMessage, isPresented: $showError)
            .task {
                if agencyName.isEmpty, let user = try? await api.fetchUser(forceRefresh: true) {
                    agencyName = user.full_name
                }
            }
        }
    }

    private func submit() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await api.completeOnboarding(agencyName: agencyName, consent: true)
            _ = try? await api.fetchUser(forceRefresh: true)
            await MainActor.run { api.needsOnboarding = false }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            showError = true
        }
    }
}
