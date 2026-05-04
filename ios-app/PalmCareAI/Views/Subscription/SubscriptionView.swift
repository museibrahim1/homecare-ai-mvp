import SwiftUI
import StoreKit

/// In-app subscription paywall backed by StoreKit 2.
///
/// Apple App Review Guideline 3.1.1: digital subscriptions consumed inside
/// an iOS app must be sold via in-app purchase. We never link out to Stripe
/// from this screen. Web users continue to use Stripe via the marketing
/// site; iOS users use Apple IAP, which the backend reconciles into the
/// same `Subscription` model.
struct SubscriptionView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var store = StoreManager.shared
    @Environment(\.dismiss) private var dismiss

    var showLimitBanner: Bool = true

    @State private var purchasingProductID: String?
    @State private var isRestoring = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        ZStack {
            Color(red: 12/255, green: 12/255, blue: 14/255)
                .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    header
                    if showLimitBanner && store.currentTier == nil { usageBanner }
                    if let currentTier = store.currentTier {
                        currentPlanCard(tier: currentTier)
                    }
                    planList
                    enterpriseCard
                    legalAndRestore
                    footerNote
                }
                .padding(.bottom, 40)
            }
        }
        .task { await store.loadProducts() }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 12) {
            HStack {
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white.opacity(0.5))
                        .frame(width: 36, height: 36)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Circle())
                }
                .accessibilityLabel("Close")
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            Image(systemName: "bolt.shield.fill")
                .font(.system(size: 44))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.palmPrimary, Color.palmAccent],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .padding(.top, 8)

            Text("Choose Your Plan")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(.white)

            Text("Unlock more assessments and grow your practice.")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.55))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(.bottom, 24)
    }

    // MARK: - Usage Banner

    private var usageBanner: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 4)
                    .frame(width: 44, height: 44)
                Circle()
                    .trim(from: 0, to: 1.0)
                    .stroke(Color.palmOrange, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 44, height: 44)
                    .rotationEffect(.degrees(-90))
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.palmOrange)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Plan Limit Reached")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("Choose a plan below to keep recording assessments.")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }
            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.palmOrange.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.palmOrange.opacity(0.2), lineWidth: 1)
                )
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }

    // MARK: - Current Plan

    private func currentPlanCard(tier: PalmTier) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 18))
                .foregroundColor(.palmGreen)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(tier.displayName) plan active")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("Manage or cancel in Settings → Apple ID → Subscriptions.")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.55))
            }
            Spacer()
            Button {
                if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("Manage")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.palmPrimary.opacity(0.15))
                    .cornerRadius(10)
            }
            .accessibilityLabel("Manage Apple subscription")
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.palmGreen.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.palmGreen.opacity(0.25), lineWidth: 1)
                )
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
    }

    // MARK: - Plan List

    private var planList: some View {
        VStack(spacing: 12) {
            if store.isLoadingProducts && store.products.isEmpty {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else if store.products.isEmpty {
                emptyStateCard
            } else {
                ForEach(store.products, id: \.id) { product in
                    StoreKitPlanCard(
                        product: product,
                        isCurrent: store.purchasedProductIDs.contains(product.id),
                        isPurchasing: purchasingProductID == product.id,
                        onPurchase: { Task { await purchase(product) } }
                    )
                }
            }
        }
        .padding(.horizontal, 20)
    }

    private var emptyStateCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28))
                .foregroundColor(.white.opacity(0.5))
            Text("Couldn't load plans")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.7))
            Text("Check your connection and try again.")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
            Button { Task { await store.loadProducts() } } label: {
                Text("Retry")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary.opacity(0.15))
                    .cornerRadius(10)
            }
            .padding(.top, 4)
        }
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.04))
        .cornerRadius(14)
    }

    // MARK: - Enterprise

    private var enterpriseCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "building.2.fill")
                .font(.system(size: 20))
                .foregroundColor(.palmAccent)
            VStack(alignment: .leading, spacing: 2) {
                Text("Enterprise")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Text("Unlimited runs · Custom pricing · Dedicated support")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }
            Spacer()
            Button {
                if let url = URL(string: "mailto:sales@palmtai.com?subject=Enterprise%20Plan%20Inquiry") {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("Contact Sales")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary.opacity(0.12))
                    .cornerRadius(20)
            }
            .accessibilityLabel("Contact sales for enterprise plan")
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }

    // MARK: - Legal & Restore

    /// App Review requires links to your EULA + privacy policy and a
    /// "Restore Purchases" affordance reachable on the paywall.
    private var legalAndRestore: some View {
        VStack(spacing: 14) {
            Button { Task { await restorePurchases() } } label: {
                HStack(spacing: 6) {
                    if isRestoring {
                        ProgressView().tint(.white).scaleEffect(0.7)
                    }
                    Text(isRestoring ? "Restoring…" : "Restore Purchases")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundColor(.white.opacity(0.7))
            }
            .disabled(isRestoring)
            .accessibilityLabel("Restore previous purchases")

            HStack(spacing: 18) {
                Link("Terms of Use", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.55))
                Link("Privacy Policy", destination: URL(string: "https://palmcareai.com/legal/privacy")!)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.55))
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.red.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
            if let successMessage {
                Text(successMessage)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmGreen)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
        }
        .padding(.top, 24)
        .padding(.horizontal, 20)
    }

    // MARK: - Footer

    private var footerNote: some View {
        VStack(spacing: 6) {
            Text("Subscriptions auto-renew monthly until cancelled. Manage or cancel any time in Settings → Apple ID → Subscriptions, at least 24 hours before renewal.")
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.35))
                .multilineTextAlignment(.center)
        }
        .padding(.top, 16)
        .padding(.horizontal, 24)
    }

    // MARK: - Actions

    private func purchase(_ product: Product) async {
        await MainActor.run {
            purchasingProductID = product.id
            errorMessage = nil
            successMessage = nil
        }
        do {
            _ = try await store.purchase(product)
            await MainActor.run {
                successMessage = "Welcome to PalmCare \(product.displayName)!"
                purchasingProductID = nil
            }
        } catch StoreError.userCancelled {
            await MainActor.run { purchasingProductID = nil }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                purchasingProductID = nil
            }
        }
    }

    private func restorePurchases() async {
        await MainActor.run {
            isRestoring = true
            errorMessage = nil
            successMessage = nil
        }
        do {
            try await store.restorePurchases()
            await MainActor.run {
                isRestoring = false
                successMessage = store.currentTier == nil
                    ? "No previous purchases found on this Apple ID."
                    : "Subscription restored."
            }
        } catch {
            await MainActor.run {
                isRestoring = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Plan Card backed by StoreKit Product

struct StoreKitPlanCard: View {
    let product: Product
    let isCurrent: Bool
    let isPurchasing: Bool
    let onPurchase: () -> Void

    private var isPopular: Bool {
        product.id == StoreManager.growthMonthlyID
    }

    var body: some View {
        VStack(spacing: 0) {
            if isPopular && !isCurrent {
                HStack {
                    Spacer()
                    Label("Most Popular", systemImage: "star.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(
                            LinearGradient(
                                colors: [Color.palmPrimary, Color.palmAccent],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(10, corners: [.bottomLeft])
                        .cornerRadius(10, corners: [.topRight])
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(product.displayName)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                    if isCurrent {
                        Text("Current")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.palmGreen)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.palmGreen.opacity(0.12))
                            .cornerRadius(8)
                    }
                }

                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(product.displayPrice)
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(.white)
                    Text("/ month")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.4))
                }

                Text(product.description)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.55))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)

            if !isCurrent {
                Button(action: onPurchase) {
                    HStack(spacing: 8) {
                        if isPurchasing {
                            ProgressView().tint(.white).scaleEffect(0.85)
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 16))
                        }
                        Text(isPurchasing ? "Processing…" : "Subscribe")
                            .font(.system(size: 15, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [Color.palmPrimary, Color.palmTeal600],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(14)
                }
                .disabled(isPurchasing)
                .accessibilityLabel("Subscribe to \(product.displayName)")
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(isCurrent ? Color.palmGreen.opacity(0.05) : Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(
                            isCurrent
                                ? Color.palmGreen.opacity(0.35)
                                : (isPopular ? Color.palmPrimary.opacity(0.4) : Color.white.opacity(0.08)),
                            lineWidth: isCurrent || isPopular ? 1.5 : 1
                        )
                )
        )
    }
}

// MARK: - Corner Radius Helper

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
