import Foundation
import StoreKit

/// StoreKit 2 purchase layer for PALM's auto-renewable subscriptions.
///
/// Flow:
///  1. `loadProducts()` fetches the three plans from the App Store.
///  2. `purchase(_:)` runs the native purchase sheet, then sends the signed
///     transaction (JWS) to our backend at `/billing/apple/verify`, which
///     validates it against Apple's CAs and activates the plan server-side.
///  3. `syncEntitlements()` runs on launch and re-verifies every current
///     entitlement with the backend so renewals, refunds, and revocations
///     made outside the app are always enforced.
@MainActor
final class StoreKitService: ObservableObject {
    static let shared = StoreKitService()

    /// Must stay in sync with APPLE_PRODUCT_TIER_MAP on the backend and the
    /// products configured in App Store Connect ("PALM Plans" group).
    /// The "pro" product IDs are sold as the Enterprise plan (product IDs
    /// are immutable in App Store Connect).
    static let monthlyProductIDs: [String] = [
        "com.palmcareai.app.starter.monthly",
        "com.palmcareai.app.growth.monthly",
        "com.palmcareai.app.pro.monthly",
    ]

    /// Annual plans: same tiers billed yearly at a 20% discount.
    static let annualProductIDs: [String] = [
        "com.palmcareai.app.starter.annual",
        "com.palmcareai.app.growth.annual",
        "com.palmcareai.app.pro.annual",
    ]

    static let productIDs: [String] = monthlyProductIDs + annualProductIDs

    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []
    @Published var isLoadingProducts = false
    @Published var purchaseInFlight = false
    @Published var lastError: String?

    private var updatesTask: Task<Void, Never>?

    private init() {
        // Listen for transactions that arrive outside an active purchase
        // (renewals, Ask to Buy approvals, purchases on another device).
        updatesTask = Task.detached { [weak self] in
            for await update in Transaction.updates {
                await self?.handle(transactionResult: update)
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - Products

    func loadProducts() async {
        guard products.isEmpty else { return }
        PostHogService.shared.capture("subscription_products_load_started")
        isLoadingProducts = true
        defer { isLoadingProducts = false }
        do {
            let storeProducts = try await Product.products(for: Self.productIDs)
            // Preserve our tier order (cheapest first).
            products = Self.productIDs.compactMap { id in
                storeProducts.first(where: { $0.id == id })
            }
            PostHogService.shared.capture("subscription_products_load_succeeded", properties: [
                "count": products.count,
            ])
        } catch {
            PostHogService.shared.capture("subscription_products_load_failed")
            lastError = "Couldn't load plans from the App Store. Please try again."
        }
    }

    // MARK: - Purchase

    /// Runs the App Store purchase sheet and activates the plan on our backend.
    /// Returns true when the subscription is active.
    func purchase(_ product: Product) async -> Bool {
        PostHogService.shared.capture("subscription_purchase_started", properties: [
            "product_id": product.id,
        ])
        purchaseInFlight = true
        lastError = nil
        defer { purchaseInFlight = false }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let ok = await handle(transactionResult: verification)
                PostHogService.shared.capture(ok ? "subscription_purchase_succeeded" : "subscription_purchase_failed", properties: [
                    "product_id": product.id,
                ])
                return ok
            case .userCancelled:
                PostHogService.shared.capture("subscription_purchase_cancelled", properties: [
                    "product_id": product.id,
                ])
                return false
            case .pending:
                // Ask to Buy / deferred — the Transaction.updates listener
                // will pick it up when it completes.
                PostHogService.shared.capture("subscription_purchase_pending", properties: [
                    "product_id": product.id,
                ])
                lastError = "Your purchase is pending approval."
                return false
            @unknown default:
                PostHogService.shared.capture("subscription_purchase_failed", properties: [
                    "product_id": product.id,
                ])
                return false
            }
        } catch {
            PostHogService.shared.capture("subscription_purchase_failed", properties: [
                "product_id": product.id,
            ])
            lastError = error.palmFriendlyMessage
            return false
        }
    }

    /// Re-verifies every live entitlement with the backend. Called on app
    /// launch and from "Restore Purchases".
    func syncEntitlements() async {
        var found: Set<String> = []
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let transaction) = entitlement,
               Self.productIDs.contains(transaction.productID) {
                found.insert(transaction.productID)
                _ = await verifyWithBackend(
                    jws: entitlement.jwsRepresentation,
                    productID: transaction.productID
                )
            }
        }
        purchasedProductIDs = found
        PostHogService.shared.capture("subscription_entitlements_synced", properties: [
            "active_products": found.count,
        ])
    }

    /// The most recent verified transaction ID for any of our products.
    /// Used by Settings to present Apple's refund request sheet.
    func latestTransactionID() async -> UInt64? {
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let transaction) = entitlement,
               Self.productIDs.contains(transaction.productID) {
                return transaction.id
            }
        }
        return nil
    }

    /// AppStore.sync() forces a refresh from the App Store (restore flow).
    func restorePurchases() async -> Bool {
        PostHogService.shared.capture("subscription_restore_started")
        do {
            try await AppStore.sync()
        } catch {
            // User cancelled the App Store sign-in — not an error worth showing.
        }
        await syncEntitlements()
        let restored = !purchasedProductIDs.isEmpty
        PostHogService.shared.capture(restored ? "subscription_restore_succeeded" : "subscription_restore_empty")
        return restored
    }

    // MARK: - Internals

    @discardableResult
    private func handle(transactionResult: VerificationResult<Transaction>) async -> Bool {
        guard case .verified(let transaction) = transactionResult else {
            lastError = "Purchase could not be verified by the App Store."
            return false
        }
        guard Self.productIDs.contains(transaction.productID) else {
            await transaction.finish()
            return false
        }

        let activated = await verifyWithBackend(
            jws: transactionResult.jwsRepresentation,
            productID: transaction.productID
        )
        if activated {
            purchasedProductIDs.insert(transaction.productID)
            // Only finish after the backend has recorded the purchase, so an
            // unfinished transaction is redelivered if the network call fails.
            await transaction.finish()
        }
        return activated
    }

    private struct VerifyResponse: Codable {
        let success: Bool
        let plan_tier: String?
        let subscription_status: String?
    }

    private func verifyWithBackend(jws: String, productID: String) async -> Bool {
        do {
            let response: VerifyResponse = try await APIService.shared.request(
                "POST",
                path: "/billing/apple/verify",
                body: [
                    "signed_transaction": jws,
                    "product_id": productID,
                ]
            )
            return response.success
        } catch {
            lastError = error.palmFriendlyMessage
            return false
        }
    }
}
