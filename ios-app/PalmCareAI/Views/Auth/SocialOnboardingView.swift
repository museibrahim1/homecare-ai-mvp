import SwiftUI

/// Agency essentials after social signup (User exists, no Business yet).
/// Matches Paper Auth Glass → Agency Setup.
struct SocialOnboardingView: View {
    @EnvironmentObject var api: APIService
    @AppStorage("aiProcessingConsentAccepted") private var aiConsentAccepted = false

    @State private var agencyName = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var stateCode = ""
    @State private var zipCode = ""

    @State private var showConsent = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @FocusState private var focused: Field?

    private enum Field: Hashable {
        case agency, phone, address, city, state, zip
    }

    private var formIsValid: Bool {
        !agencyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && phone.trimmingCharacters(in: .whitespacesAndNewlines).count >= 7
            && !address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && stateCode.trimmingCharacters(in: .whitespacesAndNewlines).count == 2
            && zipCode.trimmingCharacters(in: .whitespacesAndNewlines).count >= 5
    }

    var body: some View {
        NavigationStack {
            ZStack {
                PalmGlassBackground()

                ScrollView {
                    VStack(spacing: 0) {
                        header
                            .padding(.top, 12)
                            .padding(.bottom, 20)

                        formCard
                            .padding(.horizontal, 24)
                            .padding(.bottom, 28)

                        continueButton
                            .padding(.horizontal, 24)
                            .padding(.bottom, 40)
                    }
                    .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)
            }
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

    private var header: some View {
        VStack(spacing: 14) {
            PalmOrbLogo(size: 72, animated: true)
            VStack(spacing: 6) {
                Text("Set up your agency")
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundColor(.palmText)
                    .tracking(-0.4)
                Text("Name, phone, and business address so contracts can list the right provider.")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 12)
            }
        }
        .padding(.horizontal, 24)
    }

    private var formCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            fieldBlock(label: "Agency name", field: .agency) {
                TextField("Sunrise Home Care", text: $agencyName)
                    .textContentType(.organizationName)
                    .submitLabel(.next)
                    .focused($focused, equals: .agency)
                    .onSubmit { focused = .phone }
            }

            fieldBlock(label: "Business phone", field: .phone) {
                TextField("(402) 555-0100", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .focused($focused, equals: .phone)
            }

            fieldBlock(label: "Street address", field: .address) {
                TextField("123 Main St", text: $address)
                    .textContentType(.fullStreetAddress)
                    .submitLabel(.next)
                    .focused($focused, equals: .address)
                    .onSubmit { focused = .city }
            }

            HStack(spacing: 10) {
                fieldBlock(label: "City", field: .city) {
                    TextField("Omaha", text: $city)
                        .textContentType(.addressCity)
                        .submitLabel(.next)
                        .focused($focused, equals: .city)
                        .onSubmit { focused = .state }
                }

                fieldBlock(label: "State", field: .state) {
                    TextField("NE", text: $stateCode)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($focused, equals: .state)
                        .onChange(of: stateCode) { value in
                            let clipped = String(value.uppercased().filter(\.isLetter).prefix(2))
                            if clipped != value { stateCode = clipped }
                        }
                        .onSubmit { focused = .zip }
                }
                .frame(width: 72)

                fieldBlock(label: "ZIP", field: .zip) {
                    TextField("68102", text: $zipCode)
                        .keyboardType(.numberPad)
                        .textContentType(.postalCode)
                        .focused($focused, equals: .zip)
                        .onChange(of: zipCode) { value in
                            let clipped = String(value.filter(\.isNumber).prefix(10))
                            if clipped != value { zipCode = clipped }
                        }
                }
                .frame(width: 88)
            }
        }
        .padding(.vertical, 20)
        .padding(.horizontal, 16)
        .palmGlassCard(radius: PalmGlass.cardRadius, fillOpacity: 0.62)
    }

    private func fieldBlock<Content: View>(
        label: String,
        field: Field,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            PalmGlassLabel(text: label)
            content()
                .font(.body)
                .foregroundColor(.palmText)
                .palmGlassField(focused: focused == field)
        }
    }

    private var continueButton: some View {
        Button {
            focused = nil
            showConsent = true
        } label: {
            ZStack {
                Text(isLoading ? "Saving…" : "Continue")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .opacity(isLoading ? 0 : 1)
                if isLoading {
                    ProgressView().tint(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                Capsule(style: .continuous)
                    .fill(formIsValid ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
            )
            .shadow(color: formIsValid ? PalmGlass.tealShadow : .clear, radius: 12, y: 6)
        }
        .disabled(!formIsValid || isLoading)
    }

    private func submit() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await api.completeOnboarding(
                agencyName: agencyName,
                phone: phone,
                address: address,
                city: city,
                state: stateCode,
                zipCode: zipCode,
                consent: true
            )
            _ = try? await api.fetchUser(forceRefresh: true)
            await MainActor.run { api.needsOnboarding = false }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            showError = true
        }
    }
}
