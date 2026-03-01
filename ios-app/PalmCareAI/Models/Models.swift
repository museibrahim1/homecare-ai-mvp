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
    let runs_per_month: Int?
    let price_monthly: Double
    let price_per_run: Double?
    let old_price: Double?
    let stripe_price_id: String?
    let is_popular: Bool?
    let features: [String]?

    var isEnterprise: Bool { runs_per_month == nil }
}

struct UserSubscription: Codable {
    let plan_name: String?
    let status: String?
    let runs_used: Int?
    let runs_limit: Int?
    let current_period_end: String?

    var isAtLimit: Bool {
        guard let used = runs_used, let limit = runs_limit else { return false }
        return used >= limit
    }

    var runsRemaining: Int {
        guard let used = runs_used, let limit = runs_limit else { return 0 }
        return max(0, limit - used)
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
        } else {
            try container.encodeNil()
        }
    }
}
