import SwiftUI
import StoreKit

/// Subscription paywall: Mobile ($89.99) and Platform ($199.99) auto-renewing plans.
struct PaywallView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var store = StoreKitService.shared
    @Environment(\.dismiss) private var dismiss

    var isRequired: Bool = false
    var allowsNotNow: Bool = false

    @State private var selectedProductID: String = "com.palmcareai.app.mobile.monthly"
    @State private var showSuccess = false
    @State private var restoreMessage: String?

    private struct PlanInfo {
        let title: String
        let subtitle: String
        let highlights: [String]
        let hasTrial: Bool
    }

    private let planInfoByProductID: [String: PlanInfo] = [
        "com.palmcareai.app.mobile.monthly": PlanInfo(
            title: "PalmCare Mobile",
            subtitle: "15 assessments/mo · lite CRM (30 clients)",
            highlights: [
                "AI voice to contract",
                "Lite web CRM included",
                "Smart SOAP notes and billables",
                "50-state compliance engine",
                "HIPAA BAA included",
            ],
            hasTrial: true
        ),
        "com.palmcareai.app.starter.monthly": PlanInfo(
            title: "PalmCare Platform",
            subtitle: "30 assessments/mo · CRM (150 clients)",
            highlights: [
                "Everything in Mobile",
                "Higher monthly caps",
                "Web dashboard and team seats",
                "Custom contract templates",
                "Priority support",
            ],
            hasTrial: true
        ),
    ]

    private func planInfo(for product: Product) -> PlanInfo {
        planInfoByProductID[product.id] ?? PlanInfo(
            title: "PalmCare AI",
            subtitle: "Unlimited AI assessments",
            highlights: ["AI voice to contract", "Smart SOAP notes"],
            hasTrial: true
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    header

                    if store.isLoadingProducts {
                        ProgressView("Loading plans…")
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
            .navigationTitle("Choose your plan")
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
                await store.syncBackendAccess(using: api)
                if store.hasPaidAccess(email: api.cachedUserEmail) {
                    dismiss()
                    return
                }
                if let deepLinkProduct = UserDefaults.standard.string(forKey: "deepLinkPaywallProduct"),
                   store.products.contains(where: { $0.id == deepLinkProduct }) {
                    selectedProductID = deepLinkProduct
                    UserDefaults.standard.removeObject(forKey: "deepLinkPaywallProduct")
                } else if let first = store.products.first {
                    selectedProductID = first.id
                }
            }
            .alert("You're all set", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Your subscription is active.")
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

    private var header: some View {
        VStack(spacing: 10) {
            PalmOrbLogo(size: 72, animated: false)

            Text("Record on iPhone. PALM writes the paperwork.")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(.palmText)
                .tracking(-0.3)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            Text("Pick Mobile for assessments on your phone, or Platform for the full web CRM and team seats.")
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
        let info = planInfo(for: product)
        let isSelected = selectedProductID == product.id
        let isOwned = store.purchasedProductIDs.contains(product.id)
        let hasTrialOffer = info.hasTrial && product.subscription?.introductoryOffer != nil

        return Button {
            selectedProductID = product.id
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(info.title)
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
                        Text(info.subtitle)
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
                    ForEach(info.highlights, id: \.self) { line in
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
        .accessibilityLabel("\(info.title), \(product.displayPrice) per month")
    }

    private var purchaseButton: some View {
        let selectedProduct = store.products.first(where: { $0.id == selectedProductID })
        let selectedInfo = selectedProduct.map { planInfo(for: $0) }
        let selectedHasTrial = selectedInfo?.hasTrial == true
            && selectedProduct?.subscription?.introductoryOffer != nil

        return VStack(spacing: 12) {
            Button {
                guard let product = selectedProduct else { return }
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
                 ? "30 days free, then \(selectedProduct?.displayPrice ?? "$89.99")/month. Charged to your Apple ID. Auto-renews until you cancel in Settings → Apple ID → Subscriptions."
                 : "Billed monthly to your Apple ID. Renews automatically until cancelled in Settings.")
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

            Link("Need Enterprise? Request a quote", destination: URL(string: "https://palmcareai.com/book-demo")!)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmPrimary)
                .padding(.top, 4)
        }
        .padding(.top, 4)
    }
}

#Preview {
    PaywallView()
        .environmentObject(APIService())
}
