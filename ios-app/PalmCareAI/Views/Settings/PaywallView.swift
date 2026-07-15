import SwiftUI
import StoreKit

/// Subscription paywall: three auto-renewable plans (Starter, Growth,
/// Enterprise) purchased through Apple In-App Purchase, each available
/// monthly or annually (annual saves 20%). Starter and Growth include a
/// 14 day free trial through an Apple introductory offer.
struct PaywallView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var store = StoreKitService.shared
    @Environment(\.dismiss) private var dismiss

    enum BillingPeriod: String, CaseIterable {
        case monthly = "Monthly"
        case annual = "Annual"
    }

    @State private var billingPeriod: BillingPeriod = .monthly
    @State private var selectedProductID: String = "com.palmcareai.app.growth.monthly"
    @State private var showSuccess = false
    @State private var restoreMessage: String?

    private struct PlanInfo {
        let assessments: String
        let team: String
        let highlights: [String]
        let badge: String?
        let hasTrial: Bool
    }

    /// Keyed by the base product family ("starter", "growth", "pro").
    private let planDetails: [String: PlanInfo] = [
        "starter": PlanInfo(
            assessments: "20 AI assessments a month",
            team: "5 team members",
            highlights: ["AI voice to contract", "Smart SOAP notes", "Basic reporting", "Email support"],
            badge: nil,
            hasTrial: true
        ),
        "growth": PlanInfo(
            assessments: "75 AI assessments a month",
            team: "20 team members",
            highlights: ["Everything in Starter", "Advanced analytics", "Custom contract templates", "Team management", "Priority support"],
            badge: "MOST POPULAR",
            hasTrial: true
        ),
        "pro": PlanInfo(
            assessments: "Unlimited AI assessments",
            team: "Unlimited team members",
            highlights: ["Everything in Growth", "Dedicated account manager", "50-state compliance engine", "Custom dashboards", "HIPAA BAA included"],
            badge: "FULL SCALE",
            hasTrial: false
        ),
    ]

    private func planFamily(_ productID: String) -> String {
        if productID.contains(".starter.") { return "starter" }
        if productID.contains(".growth.") { return "growth" }
        return "pro"
    }

    private var visibleProducts: [Product] {
        let suffix = billingPeriod == .monthly ? ".monthly" : ".annual"
        return store.products.filter { $0.id.hasSuffix(suffix) }
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    header

                    if store.isLoadingProducts {
                        ProgressView("Loading plans…")
                            .padding(.vertical, 40)
                    } else if store.products.isEmpty {
                        loadFailedView
                    } else {
                        if !store.products.filter({ $0.id.hasSuffix(".annual") }).isEmpty {
                            billingToggle
                        }

                        ForEach(visibleProducts, id: \.id) { product in
                            planCard(product)
                        }

                        purchaseButton
                        footerLinks
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 40)
            }
            .background(Color.palmBackground)
            .navigationTitle("Plans")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await store.loadProducts() }
            .onChange(of: billingPeriod) { newPeriod in
                // Keep the same plan family selected when switching periods.
                let family = planFamily(selectedProductID)
                let suffix = newPeriod == .monthly ? ".monthly" : ".annual"
                if let match = store.products.first(where: { $0.id.contains(".\(family).") && $0.id.hasSuffix(suffix) }) {
                    selectedProductID = match.id
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
                Button("OK", role: .cancel) {}
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
        VStack(spacing: 8) {
            PalmOrbLogo(size: 64, animated: false)
                .padding(.top, 8)

            Text("Pick the plan that fits your agency")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.palmText)
                .multilineTextAlignment(.center)

            Text("Record the visit. PALM writes the notes, billables, and the state-compliant service agreement.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
        }
    }

    private var billingToggle: some View {
        VStack(spacing: 6) {
            Picker("Billing period", selection: $billingPeriod) {
                ForEach(BillingPeriod.allCases, id: \.self) { period in
                    Text(period.rawValue).tag(period)
                }
            }
            .pickerStyle(.segmented)

            if billingPeriod == .annual {
                Text("Save 20% with annual billing")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmGreen)
            }
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
                    .cornerRadius(12)
            }
        }
        .padding(.vertical, 40)
    }

    private func planCard(_ product: Product) -> some View {
        let info = planDetails[planFamily(product.id)]
        let isSelected = selectedProductID == product.id
        let isOwned = store.purchasedProductIDs.contains(product.id)
        let isAnnual = product.id.hasSuffix(".annual")
        // Only show the trial pill when Apple actually has the intro offer
        // configured for this product.
        let hasTrialOffer = (info?.hasTrial ?? false) && product.subscription?.introductoryOffer != nil

        return Button {
            selectedProductID = product.id
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 8) {
                            Text(product.displayName)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.palmText)
                            if let badge = info?.badge {
                                Text(badge)
                                    .font(.system(size: 9, weight: .heavy))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Color.palmPrimary)
                                    .cornerRadius(6)
                            }
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
                        if let info {
                            Text("\(info.assessments) · \(info.team)")
                                .font(.system(size: 12))
                                .foregroundColor(.palmSecondary)
                        }
                        if hasTrialOffer {
                            Text("14 day free trial")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundColor(.palmGreen)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Color.palmGreen.opacity(0.12))
                                .cornerRadius(6)
                                .padding(.top, 2)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 0) {
                        Text(product.displayPrice)
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundColor(.palmText)
                        Text(isAnnual ? "per year" : "per month")
                            .font(.system(size: 10))
                            .foregroundColor(.palmSecondary)
                    }
                }

                if isSelected, let info {
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(info.highlights, id: \.self) { line in
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 12))
                                    .foregroundColor(.palmGreen)
                                Text(line)
                                    .font(.system(size: 12))
                                    .foregroundColor(.palmText)
                            }
                        }
                    }
                    .padding(.top, 2)
                }
            }
            .padding(14)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Color.palmPrimary : Color.palmBorder, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(product.displayName), \(product.displayPrice) \(isAnnual ? "per year" : "per month")")
    }

    private var purchaseButton: some View {
        let selectedHasTrial = visibleProducts.first(where: { $0.id == selectedProductID })
            .flatMap { product -> Bool? in
                (planDetails[planFamily(product.id)]?.hasTrial ?? false)
                    && product.subscription?.introductoryOffer != nil
            } ?? false

        return VStack(spacing: 10) {
            Button {
                guard let product = store.products.first(where: { $0.id == selectedProductID }) else { return }
                Task {
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
                         : (selectedHasTrial ? "Start 14 Day Free Trial" : "Subscribe"))
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(
                    LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                   startPoint: .leading, endPoint: .trailing)
                )
                .cornerRadius(14)
            }
            .disabled(store.purchaseInFlight || store.purchasedProductIDs.contains(selectedProductID))
            .accessibilityLabel(selectedHasTrial ? "Start 14 day free trial" : "Subscribe to selected plan")

            Text(billingPeriod == .annual
                 ? "Billed yearly to your Apple ID. Renews automatically until cancelled in Settings. Cancel anytime."
                 : "Billed monthly to your Apple ID. Renews automatically until cancelled in Settings. Cancel anytime.")
                .font(.system(size: 11))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
        }
    }

    private var footerLinks: some View {
        VStack(spacing: 10) {
            Button {
                Task {
                    let restored = await store.restorePurchases()
                    restoreMessage = restored
                        ? "Your subscription has been restored."
                        : "No previous purchases were found for this Apple ID."
                }
            } label: {
                Text("Restore Purchases")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
            }
            .accessibilityLabel("Restore previous purchases")

            HStack(spacing: 16) {
                Link("Terms of Use", destination: URL(string: "https://palmcareai.com/terms")!)
                Link("Privacy Policy", destination: URL(string: "https://palmcareai.com/privacy")!)
            }
            .font(.system(size: 11))
            .foregroundColor(.palmSecondary)
        }
        .padding(.top, 4)
    }
}

#Preview {
    PaywallView()
        .environmentObject(APIService())
}
