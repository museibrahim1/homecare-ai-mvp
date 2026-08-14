import SwiftUI
import StoreKit

/// Subscription paywall: one auto-renewable plan (PalmCare AI, $199/month,
/// everything included) purchased through Apple In-App Purchase, with a
/// 14 day free trial through an Apple introductory offer.
struct PaywallView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var store = StoreKitService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var selectedProductID: String = "com.palmcareai.app.starter.monthly"
    @State private var showSuccess = false
    @State private var restoreMessage: String?

    private struct PlanInfo {
        let assessments: String
        let team: String
        let highlights: [String]
        let hasTrial: Bool
    }

    /// The single plan. Everything is included for one flat price.
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
                VStack(spacing: 18) {
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
                .padding(.horizontal, 18)
                .padding(.bottom, 40)
            }
            .background(Color.palmBackground)
            .navigationTitle("Plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
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

            Text("One plan. Everything included.")
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
        let isSelected = selectedProductID == product.id
        let isOwned = store.purchasedProductIDs.contains(product.id)
        // Only show the trial pill when Apple actually has the intro offer
        // configured for this product.
        let hasTrialOffer = planInfo.hasTrial && product.subscription?.introductoryOffer != nil

        return Button {
            selectedProductID = product.id
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 8) {
                            Text("PalmCare AI")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.palmText)
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
                        Text("per month")
                            .font(.system(size: 10))
                            .foregroundColor(.palmSecondary)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(planInfo.highlights, id: \.self) { line in
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
            .padding(14)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Color.palmPrimary : Color.palmBorder, lineWidth: isSelected ? 2 : 1)
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
            .accessibilityLabel(selectedHasTrial ? "Start 14 day free trial" : "Subscribe to the plan")

            Text("Billed monthly to your Apple ID. Renews automatically until cancelled in Settings. Cancel anytime.")
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
