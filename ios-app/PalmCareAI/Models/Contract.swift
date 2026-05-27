import Foundation

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
