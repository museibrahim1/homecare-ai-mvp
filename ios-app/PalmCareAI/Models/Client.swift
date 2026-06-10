import Foundation

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

extension String {
    /// "3055550187" → "(305) 555-0187". Leaves anything that isn't a plain
    /// 10-digit (or 1-prefixed 11-digit) US number untouched.
    var palmFormattedPhone: String {
        let digits = filter(\.isNumber)
        if digits.count == 10 {
            let area = digits.prefix(3)
            let mid = digits.dropFirst(3).prefix(3)
            let last = digits.suffix(4)
            return "(\(area)) \(mid)-\(last)"
        }
        if digits.count == 11, digits.first == "1" {
            let rest = digits.dropFirst()
            let area = rest.prefix(3)
            let mid = rest.dropFirst(3).prefix(3)
            let last = rest.suffix(4)
            return "+1 (\(area)) \(mid)-\(last)"
        }
        return self
    }

    /// "1941-03-22" → "Mar 22, 1941". Leaves unparseable values untouched.
    var palmFormattedDateOnly: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        guard let date = formatter.date(from: String(prefix(10))) else { return self }
        return date.formatted(.dateTime.month(.abbreviated).day().year())
    }
}
