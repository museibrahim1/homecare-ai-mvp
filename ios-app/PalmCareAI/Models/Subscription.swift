import Foundation

struct SubscriptionPlan: Codable, Identifiable {
    let id: String
    let name: String
    let tier: String?
    let description: String?
    let monthly_price: Double?
    let annual_price: Double?
    let setup_fee: Double?
    let max_users: Int?
    let is_contact_sales: Bool?
    let features: [String]?

    var isEnterprise: Bool { is_contact_sales ?? false }
    var displayPrice: String {
        guard let price = monthly_price, price > 0 else { return "Contact Sales" }
        return String(format: "$%.0f", price)
    }
}

struct SubscriptionDetail: Codable {
    let id: String?
    let status: String?
    let billing_cycle: String?
    let current_period_start: String?
    let current_period_end: String?
    let trial_ends_at: String?
    let cancelled_at: String?
    let visits_this_month: Int?
    let storage_used_mb: Int?
    let business_id: String?
}

struct SubscriptionPlanDetail: Codable {
    let id: String?
    let name: String?
    let tier: String?
    let monthly_price: Double?
    let annual_price: Double?
    let max_users: Int?
    let max_clients: Int?
    let max_visits_per_month: Int?
    let max_storage_gb: Int?
    let features: [String]?
}

struct SubscriptionResponse: Codable {
    let subscription: SubscriptionDetail?
    let plan: SubscriptionPlanDetail?
}

struct UserSubscription: Codable {
    let plan_name: String?
    let plan_tier: String?
    let has_paid_plan: Bool?
    let completed_assessments: Int?
    let total_assessments: Int?
    let max_allowed: Int?
    let can_create: Bool?
    let upgrade_required: Bool?

    var runs_used: Int? { total_assessments }
    var runs_limit: Int? { max_allowed }

    var isAtLimit: Bool {
        upgrade_required ?? false
    }

    var runsRemaining: Int {
        guard let total = total_assessments, let max = max_allowed else { return 0 }
        return Swift.max(0, max - total)
    }
}

struct CheckoutResponse: Codable {
    let checkout_url: String
    let session_id: String
}
