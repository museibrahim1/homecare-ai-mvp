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
        role == "admin" && (email.hasSuffix("@palmtai.com") || email.hasSuffix("@palmcareai.com"))
    }

    func hasPermission(_ perm: String) -> Bool {
        if isCeo { return true }
        guard let perms = permissions else { return false }
        return perms.contains("admin_full") || perms.contains(perm)
    }
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
