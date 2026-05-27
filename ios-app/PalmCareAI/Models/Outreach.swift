import Foundation

struct OutreachWeeklyPlan: Codable {
    let days: [OutreachDay]
    let stats: OutreachStats?
    let week_start: String?
    let week_end: String?
    let week_offset: Int?
    let total_weeks: Int?
    let all_contacts_covered: Bool?
}

struct OutreachStats: Codable {
    let total_leads: Int?
    let leads_with_email: Int?
    let leads_contacted: Int?
    let leads_remaining_email: Int?
    let leads_no_email: Int?
    let calls_remaining: Int?
    let total_investors: Int?
    let investors_with_email: Int?
    let investors_contacted: Int?
    let investors_remaining: Int?
}

struct OutreachDay: Codable, Identifiable {
    let date: String
    let day_name: String?
    let is_today: Bool?
    let agency_drafts: [AgencyDraft]?
    let investor_drafts: [InvestorDraft]?
    let calls: [OutreachCall]?

    var id: String { date }
}

struct AgencyDraft: Codable, Identifiable {
    let id: String
    let provider_name: String?
    let contact_name: String?
    let contact_email: String?
    let state: String?
    let city: String?
    let phone: String?
    let status: String?
    let priority: String?
    let email_send_count: Int?
    let last_email_sent_at: String?
    let draft_subject: String?
    let draft_body: String?
    let is_html: Bool?
}

struct InvestorDraft: Codable, Identifiable {
    let id: String
    let fund_name: String?
    let contact_name: String?
    let contact_email: String?
    let investor_type: String?
    let location: String?
    let status: String?
    let priority: String?
    let email_send_count: Int?
    let last_email_sent_at: String?
    let draft_subject: String?
    let draft_body: String?
    let is_html: Bool?
}

struct OutreachCall: Codable, Identifiable {
    let id: String
    let provider_name: String?
    let contact_name: String?
    let phone: String?
    let state: String?
    let status: String?
    let priority: String?
    let is_contacted: Bool?
    let notes: String?
    let called_at: String?
    let assigned_to: String?
    let contact_email: String?
}

struct SalesLead: Codable, Identifiable {
    let id: String
    let provider_name: String?
    let contact_name: String?
    let contact_email: String?
    let phone: String?
    let state: String?
    let city: String?
    let status: String?
    let priority: String?
    let is_contacted: Bool?
    let is_converted: Bool?
    let email_send_count: Int?
    let email_open_count: Int?
    let last_email_sent_at: String?
    let campaign_tag: String?
    let created_at: String?
}

struct SalesLeadsResponse: Codable {
    let leads: [SalesLead]?
    let items: [SalesLead]?
    let total: Int?
}

struct InvestorRecord: Codable, Identifiable {
    let id: String
    let fund_name: String?
    let contact_name: String?
    let contact_email: String?
    let investor_type: String?
    let website: String?
    let location: String?
    let status: String?
    let priority: String?
    let email_send_count: Int?
    let email_open_count: Int?
    let last_email_sent_at: String?
    let campaign_tag: String?
    let source: String?
    let created_at: String?
}

struct DraftResponse: Codable {
    let draft_id: String
    let target_type: String
    let target_id: String
    let target_name: String
    let to_email: String
    let subject: String
    let body: String
    let is_html: Bool
}

struct BatchSendResponse: Codable {
    let ok: Bool?
    let day: String?
    let date: String?
    let results: BatchSendResults?
}

struct BatchSendResults: Codable {
    let agencies: BatchSendDetail?
    let investors: BatchSendDetail?
}

struct BatchSendDetail: Codable {
    let sent: Int?
    let failed: Int?
    let skipped: Int?
}
