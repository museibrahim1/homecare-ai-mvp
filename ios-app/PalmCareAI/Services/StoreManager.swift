import Foundation
import StoreKit

/// StoreKit 2 manager for PalmCare AI's auto-renewable subscriptions.
///
/// Apple App Review Guideline 3.1.1 requires that digital subscriptions used
/// inside the iOS app go through StoreKit. This class:
///  * loads our three subscription `Product`s by ID
///  * exposes the purchased entitlements as `@Published` state
///  * forwards every successful StoreKit transaction to our backend so the
///    server-side `Subscription` row stays in sync (powers usage limits)
///  * listens for renewals/refunds while the app is running
///
/// Product IDs MUST match `APPLE_PRODUCT_TIER_MAP` in `apps/api/app/routers/apple_iap.py`
/// AND the auto-renewable subscription products you create in App Store Connect.
@MainActor
final class StoreManager: ObservableObject {
    static let shared = StoreManager()

    // Keep these as constants so they can't drift between code paths.
    static let starterMonthlyID = "com.palmtechnologies.palmcare.starter.monthly"
    static let growthMonthlyID = "com.palmtechnologies.palmcare.growth.monthly"
    static let proMonthlyID = "com.palmtechnologies.palmcare.pro.monthly"

    static let allProductIDs: [String] = [
        starterMonthlyID,
        growthMonthlyID,
        proMonthlyID,
    ]

    @Published private(set) var products: [Product] = []
    @Published private(set) var purchasedProductIDs: Set<String> = []
    @Published private(set) var isLoadingProducts = false
    @Published private(set) var lastError: String?

    /// Tier currently entitled, mapped from purchased product IDs. `nil`
    /// means no active App Store entitlement (free tier or web Stripe sub).
    var currentTier: PalmTier? {
        if purchasedProductIDs.contains(Self.proMonthlyID) { return .pro }
        if purchasedProductIDs.contains(Self.growthMonthlyID) { return .growth }
        if purchasedProductIDs.contains(Self.starterMonthlyID) { return .starter }
        return nil
    }

    private var transactionListenerTask: Task<Void, Never>?

    private init() {
        transactionListenerTask = listenForTransactions()
    }

    deinit {
        transactionListenerTask?.cancel()
    }

    // MARK: - Public API

    /// Load `Product` definitions from the App Store. Call on view appear.
    func loadProducts() async {
        guard !isLoadingProducts else { return }
        isLoadingProducts = true
        defer { isLoadingProducts = false }

        do {
            let storeProducts = try await Product.products(for: Self.allProductIDs)
            products = storeProducts.sorted { $0.price < $1.price }
            await refreshPurchasedProducts()
        } catch {
            lastError = "Could not load subscription plans. Please check your connection and try again."
        }
    }

    /// Initiate an App Store purchase for the given product.
    /// Throws on user cancel, payment-not-allowed, or backend verification failure.
    func purchase(_ product: Product) async throws -> StoreTransaction {
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try Self.checkVerified(verification)
            try await syncTransactionWithServer(transaction, productID: product.id)
            await transaction.finish()
            await refreshPurchasedProducts()
            return StoreTransaction(productID: product.id, transactionID: transaction.id)

        case .userCancelled:
            throw StoreError.userCancelled

        case .pending:
            throw StoreError.pending

        @unknown default:
            throw StoreError.unknown
        }
    }

    /// Restore previously purchased subscriptions (Apple guideline 3.1.1).
    /// `AppStore.sync()` re-validates entitlements and triggers updates via
    /// `Transaction.updates`, which our listener catches.
    func restorePurchases() async throws {
        try await AppStore.sync()
        await refreshPurchasedProducts()
    }

    /// Re-evaluate which subscriptions are currently entitled.
    func refreshPurchasedProducts() async {
        var newPurchased: Set<String> = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            // Skip auto-renewables that have lapsed without a current period.
            if let expirationDate = transaction.expirationDate,
               expirationDate < Date() {
                continue
            }
            if transaction.revocationDate != nil { continue }
            newPurchased.insert(transaction.productID)

            // Sync each verified entitlement to server on every refresh so
            // upgrades/downgrades made on another device propagate.
            try? await syncTransactionWithServer(transaction, productID: transaction.productID)
        }
        purchasedProductIDs = newPurchased
    }

    // MARK: - Helpers

    private static func checkVerified<T>(_ verification: VerificationResult<T>) throws -> T {
        switch verification {
        case .unverified:
            throw StoreError.unverified
        case .verified(let safe):
            return safe
        }
    }

    private func syncTransactionWithServer(
        _ transaction: Transaction,
        productID: String
    ) async throws {
        // jsonRepresentation is the JWS-signed transaction string. The
        // backend will verify it against Apple's CAs and grant the matching
        // subscription tier.
        let signedJWS = String(data: transaction.jsonRepresentation, encoding: .utf8) ?? ""
        guard !signedJWS.isEmpty else {
            throw StoreError.serverSyncFailed("Could not serialize transaction")
        }
        let body: [String: Any] = [
            "signed_transaction": signedJWS,
            "product_id": productID,
        ]
        do {
            let _: [String: AnyCodable] = try await APIService.shared.request(
                "POST",
                path: "/billing/apple/verify",
                body: body
            )
        } catch {
            throw StoreError.serverSyncFailed(error.localizedDescription)
        }
    }

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                if let self {
                    try? await self.syncTransactionWithServer(transaction, productID: transaction.productID)
                    await self.refreshPurchasedProducts()
                }
                await transaction.finish()
            }
        }
    }
}

// MARK: - Supporting Types

enum PalmTier: String, CaseIterable {
    case starter
    case growth
    case pro

    var displayName: String {
        switch self {
        case .starter: return "Starter"
        case .growth: return "Growth"
        case .pro: return "Pro"
        }
    }
}

struct StoreTransaction {
    let productID: String
    let transactionID: UInt64
}

enum StoreError: LocalizedError {
    case userCancelled
    case pending
    case unverified
    case unknown
    case serverSyncFailed(String)

    var errorDescription: String? {
        switch self {
        case .userCancelled: return "Purchase cancelled."
        case .pending: return "Purchase is pending approval. We'll unlock your plan once it's complete."
        case .unverified: return "App Store could not verify this purchase. Please try again."
        case .unknown: return "Something went wrong with the App Store. Please try again."
        case .serverSyncFailed(let msg): return "Purchased, but we couldn't activate your plan: \(msg). Please try again or contact support."
        }
    }
}
