import Foundation

struct Visit: Codable, Identifiable {
    let id: String
    let client_id: String
    let caregiver_id: String?
    let scheduled_start: String?
    let scheduled_end: String?
    let actual_start: String?
    let actual_end: String?
    let status: String
    let pipeline_state: [String: AnyCodable]?
    let admin_notes: String?
    let created_at: String
    let updated_at: String?
    let client: Client?
    let caregiver: User?

    /// "pending_review" → "Pending Review" for status badges.
    var displayStatus: String {
        status.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

struct VisitListResponse: Codable {
    let items: [Visit]
    let total: Int
    let page: Int
    let page_size: Int
}

struct PipelineStatusResponse: Codable {
    let visit_id: String?
    let status: String?
    let pipeline_state: [String: AnyCodable]?
}
