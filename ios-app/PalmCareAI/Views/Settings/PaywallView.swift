import SwiftUI
import StoreKit

/// Subscription paywall: one auto-renewable plan with a 30-day Apple trial.
/// Tapping the CTA runs StoreKit `product.purchase()`, which presents the
/// native App Store payment sheet. Trial requires an Apple ID payment method;
/// Apple auto-charges the monthly price when the trial ends unless cancelled.
struct PaywallView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var store = StoreKitService.shared
    @Environment(\.dismiss) private var dismiss

    /// When true (assessment gate): no "Done". User must subscribe or cancel
    /// the recording attempt via "Not now" only when allowsNotNow is true.
    var isRequired: Bool = false

    /// Soft prompts may dismiss. Assessment / post-auth gates should pass false
    /// so the user must start the Apple subscription (or leave the gated action).
    var allowsNotNow: Bool = false

    @State private var selectedProductID: String = "com.palmcareai.app.starter.monthly"
    @State private var showSuccess = false
    @State private var restoreMessage: String?

    private struct PlanInfo {
        let assessments: String
        let team: String
        let highlights: [String]
        let hasTrial: Bool
    }

    private let planInfo = PlanInfo(
        assessments: "Unlimited AI assessments",
        team: "Unlimited team members",
        highlights: [
            "AI voice to contract",
            "Smart SOAP notes",
            "Advanced analytics and reporting",
            "Custom contract templates",
            "50-state compliance engine",
            "HIPAA BAA included",
            "Priority support",
        ],
        hasTrial: true
    )

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    header

                    if store.isLoadingProducts {
                        ProgressView("Loading plan…")
                            .padding(.vertical, 40)
                    } else if store.products.isEmpty {
                        loadFailedView
                    } else {
                        ForEach(store.products, id: \.id) { product in
                            planCard(product)
                        }

                        purchaseButton
                        footerLinks
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .background(PalmGlassBackground())
            .navigationTitle("PalmCare AI")
            .navigationBarTitleDisplayMode(.inline)
            .palmTransparentNavBar()
            .toolbarBackground(.hidden, for: .navigationBar)
            .interactiveDismissDisabled(isRequired && !allowsNotNow)
            .toolbar {
                if !isRequired {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { dismiss() }
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                    }
                } else if allowsNotNow {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Not now") { dismiss() }
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                }
            }
            .task {
                await store.loadProducts()
                if let first = store.products.first {
                    selectedProductID = first.id
                }
            }
            .alert("You're all set", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Your subscription is active. Every feature is unlocked.")
            }
            .alert("Restore Purchases", isPresented: Binding(
                get: { restoreMessage != nil },
                set: { if !$0 { restoreMessage = nil } }
            )) {
                Button("OK", role: .cancel) {
                    if store.hasPaidAccess(email: api.cachedUserEmail) {
                        dismiss()
                    }
                }
            } message: {
                Text(restoreMessage ?? "")
            }
            .alert("Purchase", isPresented: Binding(
                get: { store.lastError != nil },
                set: { if !$0 { store.lastError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(store.lastError ?? "")
            }
        }
    }

    // MARK: - Sections

    private var header: some View {
        VStack(spacing: 10) {
            PalmOrbLogo(size: 72, animated: false)

            Text("One plan. Everything included.")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(.palmText)
                .tracking(-0.3)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            Text("Record the visit. PALM writes the notes, billables, and the state-compliant service agreement.")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var loadFailedView: some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28))
                .foregroundColor(.palmOrange)
            Text("Couldn't reach the App Store")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Button {
                Task { await store.loadProducts() }
            } label: {
                Text("Try Again")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary)
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func planCard(_ product: Product) -> some View {
        let isSelected = selectedProductID == product.id
        let isOwned = store.purchasedProductIDs.contains(product.id)
        let hasTrialOffer = planInfo.hasTrial && product.subscription?.introductoryOffer != nil

        return Button {
            selectedProductID = product.id
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text("PalmCare AI")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundColor(.palmText)
                                .lineLimit(1)
                            if isOwned {
                                Text("CURRENT")
                                    .font(.system(size: 9, weight: .heavy))
                                    .foregroundColor(.palmGreen)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Color.palmGreen.opacity(0.12))
                                    .cornerRadius(6)
                            }
                        }
                        Text("\(planInfo.assessments) · \(planInfo.team)")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                        if hasTrialOffer {
                            Text("30 day free trial")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundColor(.palmPrimary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.palmPrimary.opacity(0.12))
                                .cornerRadius(6)
                                .padding(.top, 2)
                        }
                    }

                    Spacer(minLength: 8)

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(product.displayPrice)
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(.palmText)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                        Text("per month")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                    .layoutPriority(1)
                }

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(planInfo.highlights, id: \.self) { line in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.palmPrimary)
                                .frame(width: 18, alignment: .center)
                            Text(line)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.palmText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding(.top, 2)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .palmGlassCard(radius: 22, fillOpacity: 0.72)
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(isSelected ? Color.palmPrimary : Color.palmGlassBorder, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("PalmCare AI, \(product.displayPrice) per month")
    }

    private var purchaseButton: some View {
        let selectedHasTrial = store.products.first(where: { $0.id == selectedProductID })
            .flatMap { product -> Bool? in
                planInfo.hasTrial && product.subscription?.introductoryOffer != nil
            } ?? false

        return VStack(spacing: 12) {
            Button {
                guard let product = store.products.first(where: { $0.id == selectedProductID }) else { return }
                Task {
                    // Presents Apple's native App Store subscription sheet.
                    if await store.purchase(product) {
                        showSuccess = true
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if store.purchaseInFlight {
                        ProgressView().tint(.white).scaleEffect(0.85)
                    }
                    Text(store.purchaseInFlight
                         ? "Processing…"
                         : (selectedHasTrial ? "Start 30 Day Free Trial" : "Subscribe"))
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    Capsule(style: .continuous)
                        .fill(Color.palmPrimary)
                )
                .shadow(color: PalmGlass.tealShadow, radius: 14, y: 6)
            }
            .disabled(store.purchaseInFlight || store.purchasedProductIDs.contains(selectedProductID))
            .accessibilityLabel(selectedHasTrial ? "Start 30 day free trial" : "Subscribe to the plan")

            Text(selectedHasTrial
                 ? "30 days free, then \(store.products.first(where: { $0.id == selectedProductID })?.displayPrice ?? "$199")/month. Charged to your Apple ID. Auto-renews until you cancel in Settings → Apple ID → Subscriptions. Cancel anytime before the trial ends to avoid being charged."
                 : "Billed monthly to your Apple ID. Renews automatically until cancelled in Settings. Cancel anytime.")
                .font(.system(size: 11))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var footerLinks: some View {
        VStack(spacing: 12) {
            Button {
                Task {
                    let restored = await store.restorePurchases()
                    restoreMessage = restored
                        ? "Your subscription has been restored."
                        : "No previous purchases were found for this Apple ID."
                }
            } label: {
                Text("Restore Purchases")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmPrimary)
            }
            .accessibilityLabel("Restore previous purchases")

            HStack(spacing: 16) {
                Link("Terms of Use", destination: URL(string: "https://palmcareai.com/terms")!)
                Link("Privacy Policy", destination: URL(string: "https://palmcareai.com/privacy")!)
            }
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.palmSecondary)
        }
        .padding(.top, 4)
    }
}

#Preview {
    PaywallView()
        .environmentObject(APIService())
}
