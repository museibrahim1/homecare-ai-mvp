import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let full_name: String
    let role: String?
    let phone: String?
    let is_active: Bool
    let created_at: String?
    let updated_at: String?
    let permissions: [String]?
    let temp_password: Bool?

    var isAdmin: Bool {
        role == "admin" || role == "admin_team"
    }

    var isCeo: Bool {
        role == "admin" && (email.hasSuffix("@palmtai.com"))
    }

    func hasPermission(_ perm: String) -> Bool {
        if isCeo { return true }
        guard let perms = permissions else { return false }
        return perms.contains("admin_full") || perms.contains(perm)
    }
}

struct Client: Codable, Identifiable {
    let id: String
    let full_name: String
    let preferred_name: String?
    let date_of_birth: String?
    let gender: String?
    let phone: String?
    let phone_secondary: String?
    let email: String?
    let address: String?
    let city: String?
    let state: String?
    let zip_code: String?
    let emergency_contact_name: String?
    let emergency_contact_phone: String?
    let emergency_contact_relationship: String?
    let emergency_contact_2_name: String?
    let emergency_contact_2_phone: String?
    let emergency_contact_2_relationship: String?
    let primary_diagnosis: String?
    let secondary_diagnoses: String?
    let allergies: String?
    let medications: String?
    let physician_name: String?
    let physician_phone: String?
    let medical_notes: String?
    let mobility_status: String?
    let cognitive_status: String?
    let living_situation: String?
    let care_level: String?
    let care_plan: String?
    let special_requirements: String?
    let insurance_provider: String?
    let insurance_id: String?
    let medicaid_id: String?
    let medicare_id: String?
    let billing_address: String?
    let preferred_days: String?
    let preferred_times: String?
    let status: String?
    let intake_date: String?
    let discharge_date: String?
    let notes: String?
    let external_id: String?
    let external_source: String?
    let created_at: String
    let updated_at: String?

    var displayStatus: String {
        status ?? "active"
    }
}

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
}

struct LoginResponse: Codable {
    let access_token: String?
    let token_type: String?
    let requires_mfa: Bool?
    let mfa_token: String?
}

struct BusinessLoginResponse: Codable {
    let access_token: String
    let token_type: String
}

struct UsageStats: Codable {
    let completed_assessments: Int
    let total_assessments: Int
    let plan_name: String?
}

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

struct VisitListResponse: Codable {
    let items: [Visit]
    let total: Int
    let page: Int
    let page_size: Int
}

// MARK: - Subscription & Billing

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

// MARK: - Live Transcription

struct LiveTranscriptResponse: Codable {
    let transcript: String
    let words: [TranscriptWord]
    let confidence: Double
    let duration: Double
    let provider: String
}

struct TranscriptWord: Codable, Identifiable {
    let word: String
    let start: Double
    let end: Double
    let confidence: Double
    let speaker: Int?

    var id: String { "\(start)-\(end)-\(word)" }
}

struct TranscriptSegment: Identifiable {
    let id = UUID()
    let speaker: Int
    let text: String
    let words: [TranscriptWord]
    let startTime: Double
    let endTime: Double

    var speakerLabel: String {
        switch speaker {
        case 0: return "Speaker 1"
        case 1: return "Speaker 2"
        default: return "Speaker \(speaker + 1)"
        }
    }
}

// MARK: - Visit Detail (Transcript, Billables, Note, Contract)

struct VisitTranscriptResponse: Codable {
    let segments: [VisitTranscriptSegment]?
    let total_duration_ms: Int?
    let word_count: Int?
    let source: String?
}

struct VisitTranscriptSegment: Codable, Identifiable {
    let id: String?
    let visit_id: String?
    let start_ms: Int?
    let end_ms: Int?
    let text: String
    let speaker_label: String?

    var stableId: String { id ?? UUID().uuidString }
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
    let adjusted_minutes: Double?
}

struct VisitNote: Codable, Identifiable {
    let id: String
    let visit_id: String?
    let narrative: String?
    let structured_data: NoteStructuredData?
    let created_at: String?
    let updated_at: String?
}

struct NoteStructuredData: Codable {
    let subjective: String?
    let objective: String?
    let assessment: String?
    let plan: String?
    let tasks_performed: [AnyCodable]?
    let visit_info: [String: AnyCodable]?
    let client_mood: String?
    let cognitive_status: String?
    let safety_observations: String?
    let next_visit_plan: String?

    var tasksAsStrings: [String] {
        guard let tasks = tasks_performed else { return [] }
        return tasks.compactMap { item -> String? in
            if let str = item.value as? String { return str }
            if let dict = item.value as? [String: Any] {
                let task = dict["task"] as? String ?? ""
                let details = dict["details"] as? String ?? ""
                return details.isEmpty ? task : "\(task): \(details)"
            }
            return nil
        }
    }
}

struct VisitContract: Codable, Identifiable {
    let id: String
    let client_id: String?
    let visit_id: String?
    let title: String?
    let services: [AnyCodable]?
    let schedule: [String: AnyCodable]?
    let hourly_rate: Double?
    let weekly_hours: Double?
    let content: String?
    let status: String?
    let start_date: String?
    let end_date: String?
    let cancellation_policy: String?
    let terms_and_conditions: String?
    let created_at: String?
    let updated_at: String?

    enum CodingKeys: String, CodingKey {
        case id, client_id, visit_id, title, services, schedule
        case hourly_rate, weekly_hours, content, status
        case start_date, end_date, cancellation_policy
        case terms_and_conditions, created_at, updated_at
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        client_id = try c.decodeIfPresent(String.self, forKey: .client_id)
        visit_id = try c.decodeIfPresent(String.self, forKey: .visit_id)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        services = try c.decodeIfPresent([AnyCodable].self, forKey: .services)
        schedule = try c.decodeIfPresent([String: AnyCodable].self, forKey: .schedule)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        start_date = try c.decodeIfPresent(String.self, forKey: .start_date)
        end_date = try c.decodeIfPresent(String.self, forKey: .end_date)
        cancellation_policy = try c.decodeIfPresent(String.self, forKey: .cancellation_policy)
        terms_and_conditions = try c.decodeIfPresent(String.self, forKey: .terms_and_conditions)
        created_at = try c.decodeIfPresent(String.self, forKey: .created_at)
        updated_at = try c.decodeIfPresent(String.self, forKey: .updated_at)

        if let d = try? c.decodeIfPresent(Double.self, forKey: .hourly_rate) {
            hourly_rate = d
        } else if let s = try? c.decodeIfPresent(String.self, forKey: .hourly_rate), let d = Double(s) {
            hourly_rate = d
        } else { hourly_rate = nil }

        if let d = try? c.decodeIfPresent(Double.self, forKey: .weekly_hours) {
            weekly_hours = d
        } else if let s = try? c.decodeIfPresent(String.self, forKey: .weekly_hours), let d = Double(s) {
            weekly_hours = d
        } else { weekly_hours = nil }

        let raw = try c.decodeIfPresent(String.self, forKey: .content)
        content = raw ?? terms_and_conditions
    }

    var servicesDescription: String {
        guard let services = services else { return "No services listed" }
        return services.compactMap { item -> String? in
            guard let dict = item.value as? [String: Any] else { return nil }
            let name = dict["name"] as? String ?? dict["service"] as? String ?? "Service"
            let desc = dict["description"] as? String
            if let desc { return "\(name): \(desc)" }
            return name
        }.joined(separator: "\n")
    }

    var scheduleDescription: String {
        guard let schedule = schedule else { return "No schedule set" }
        return schedule.compactMap { key, val -> String? in
            "\(key.capitalized): \(val.value)"
        }.joined(separator: "\n")
    }
}

// MARK: - Contract Templates

struct ContractTemplate: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let file_type: String?
    let version: Int?
    let field_count: Int?
    let unmapped_count: Int?
    let is_active: Bool?
    let created_at: String?
    let updated_at: String?
}

struct PipelineStatusResponse: Codable {
    let visit_id: String?
    let status: String?
    let pipeline_state: [String: AnyCodable]?
}

// MARK: - Calendar API Models

struct APICalendarEvent: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let start_time: String
    let end_time: String
    let location: String?
    let google_event_id: String?
    let created_at: String?
}

struct CalendarConnectionStatus: Codable {
    let connected: Bool
    let email: String?
    let calendar_id: String?
}

// MARK: - Calendar

struct CalendarEvent: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let startDate: Date
    let endDate: Date
    let location: String?
    let createdAt: Date

    init(id: String = UUID().uuidString, title: String, description: String?, startDate: Date, endDate: Date, location: String?, createdAt: Date = Date()) {
        self.id = id
        self.title = title
        self.description = description
        self.startDate = startDate
        self.endDate = endDate
        self.location = location
        self.createdAt = createdAt
    }
}

// MARK: - Documents / Contracts

struct DocumentItem: Codable, Identifiable {
    let id: String
    let name: String
    let type: String?
    let format: String?
    let size: String?
    let folder: String?
    let client_id: String?
    let client_name: String?
    let visit_id: String?
    let created_at: String?
    let download_url: String?
}

struct DocumentFolder: Codable {
    let id: Int
    let name: String
    let count: Int
    let icon: String?
}

struct DocumentsResponse: Codable {
    let documents: [DocumentItem]
    let total: Int
    let folders: [DocumentFolder]?
}

// MARK: - Contract Templates

struct ContractTemplateItem: Codable, Identifiable {
    let id: String
    let name: String
    let version: Int
    let is_active: Bool
    let file_type: String
    let field_count: Int
    let unmapped_count: Int
    let created_at: String
}

struct ContractTemplateDetail: Codable, Identifiable {
    let id: String
    let name: String
    let version: Int
    let description: String?
    let is_active: Bool
    let file_type: String
    let detected_fields: [TemplateField]?
    let field_mapping: [String: String]?
    let unmapped_fields: [TemplateField]?
    let created_at: String
    let updated_at: String
}

struct TemplateField: Codable, Identifiable {
    let field_id: String
    let label: String?
    let type: String?
    let required: Bool?
    let section: String?
    let mapped_to: String?

    var id: String { field_id }
}

struct TemplateUploadResponse: Codable {
    let id: String
    let name: String
    let version: Int
    let is_active: Bool
    let file_type: String
    let detected_fields: [TemplateField]?
    let field_mapping: [String: String]?
    let unmapped_fields: [TemplateField]?
    let created_at: String
    let updated_at: String
}

// MARK: - Tasks

struct TaskItem: Codable, Identifiable {
    let id: String
    let user_id: String?
    let smart_note_id: String?
    let title: String
    let description: String?
    let status: String
    let priority: String?
    let due_date: String?
    let completed_at: String?
    let related_client_id: String?
    let assigned_to_id: String?
    let created_at: String?
    let updated_at: String?

    var dueDate: Date? {
        guard let d = due_date else { return nil }
        return ISO8601Flexible.parse(d)
    }

    var priorityLevel: Int {
        switch priority?.lowercased() {
        case "high": return 3
        case "medium": return 2
        case "low": return 1
        default: return 0
        }
    }
}

struct TaskCreate: Codable {
    let title: String
    let description: String?
    let status: String?
    let priority: String?
    let due_date: String?
    let related_client_id: String?
}

struct TaskUpdate: Codable {
    let title: String?
    let description: String?
    let status: String?
    let priority: String?
    let due_date: String?
    let related_client_id: String?
}

// MARK: - ISO8601 Flexible Parser

enum ISO8601Flexible {
    private static let formatters: [DateFormatter] = {
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd"
        ]
        return formats.map { fmt in
            let f = DateFormatter()
            f.dateFormat = fmt
            f.locale = Locale(identifier: "en_US_POSIX")
            f.timeZone = TimeZone(secondsFromGMT: 0)
            return f
        }
    }()

    static func parse(_ string: String) -> Date? {
        for f in formatters {
            if let d = f.date(from: string) { return d }
        }
        return nil
    }
}

// MARK: - Admin / Outreach Models

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

// MARK: - AnyCodable for flexible JSON fields

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if value is NSNull {
            try container.encodeNil()
        } else if let bool = value as? Bool {
            try container.encode(bool)
        } else if let int = value as? Int {
            try container.encode(int)
        } else if let double = value as? Double {
            try container.encode(double)
        } else if let string = value as? String {
            try container.encode(string)
        } else if let array = value as? [Any] {
            try container.encode(array.map { AnyCodable($0) })
        } else if let dict = value as? [String: Any] {
            try container.encode(dict.mapValues { AnyCodable($0) })
        } else {
            try container.encodeNil()
        }
    }
}
