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
    let agreement_send: AgreementSend?
    let created_at: String
    let updated_at: String?
    let client: Client?
    let caregiver: User?

    /// "pending_review" → "Pending Review" for status badges.
    var displayStatus: String {
        status.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

struct AgreementSend: Codable, Equatable {
    let recipient_email: String?
    let cc_email: String?
    let provider: String?
    let provider_message_id: String?
    let status: String?
    let sent_at: String?
    let delivered_at: String?
    let opened_at: String?
    let bounced_at: String?
    let signed_at: String?

    var displayLabel: String {
        switch (status ?? "").lowercased() {
        case "signed": return "Signed"
        case "bounced": return "Bounced"
        case "opened": return "Opened"
        case "delivered": return "Delivered"
        case "sent": return "Sent"
        default: return "Not sent"
        }
    }

    var isAwaitingSignature: Bool {
        let s = (status ?? "").lowercased()
        return s == "sent" || s == "delivered" || s == "opened"
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
