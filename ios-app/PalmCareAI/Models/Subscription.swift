import Foundation

struct UserSubscription: Codable {
    let plan_name: String?
    let plan_tier: String?
    let has_paid_plan: Bool?
    let completed_assessments: Int?
    let total_assessments: Int?
    let max_allowed: Int?
    let can_create: Bool?
    let upgrade_required: Bool?

}
