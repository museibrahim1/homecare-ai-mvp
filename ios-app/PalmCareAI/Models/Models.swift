import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let full_name: String?
    let role: String
    let company_name: String?
    let phone: String?
    let is_active: Bool
}

struct Client: Codable, Identifiable {
    let id: String
    let full_name: String
    let preferred_name: String?
    let date_of_birth: String?
    let phone: String?
    let email: String?
    let address: String?
    let city: String?
    let state: String?
    let primary_diagnosis: String?
    let care_level: String?
    let status: String
    let created_at: String
}

struct Visit: Codable, Identifiable {
    let id: String
    let client_id: String
    let status: String
    let created_at: String
    let client: Client?
}

struct LoginResponse: Codable {
    let access_token: String?
    let requires_mfa: Bool?
    let mfa_token: String?
}

struct UsageStats: Codable {
    let completed_assessments: Int
    let total_assessments: Int
    let plan_name: String?
}
