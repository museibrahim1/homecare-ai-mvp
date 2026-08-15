import Foundation

struct UploadResponse: Codable {
    let id: String
    let visit_id: String
    let s3_key: String
    let original_filename: String?
    let content_type: String?
    let file_size_bytes: Int?
    let duration_ms: Int?
    let status: String
    let created_at: String
}

struct VisitBillablesResponse: Codable {
    let items: [BillableItem]?
    let total_minutes: Double?
    let total_adjusted_minutes: Double?
    let categories: [String: AnyCodable]?
}

struct BillableItem: Codable, Identifiable {
    let id: String
    let visit_id: String?
    let code: String?
    let category: String?
    let description: String?
    let start_ms: Int?
    let end_ms: Int?
    let minutes: Double?
    let evidence: AnyCodable?
    var is_approved: Bool?
    var is_flagged: Bool?
    let flag_reason: String?
    let adjusted_minutes: Double?

    /// Assessment / intake recommendation (not timed visit work).
    var isRecommendation: Bool {
        let reason = (flag_reason ?? "").lowercased()
        return reason.contains("recommended from assessment")
            || reason.contains("not timed visit")
    }

    var timeLabel: String {
        if isRecommendation {
            return "Recommended"
        }
        guard let minutes, minutes > 0 else {
            return "No time logged"
        }
        if minutes == 1 {
            return "1 min"
        }
        return "\(Int(minutes)) min"
    }
}
