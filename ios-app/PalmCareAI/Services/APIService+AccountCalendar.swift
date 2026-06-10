import Foundation

extension APIService {
    // MARK: - Usage

    func fetchUsage() async throws -> UserSubscription {
        try await request("GET", path: "/visits/usage")
    }

    // MARK: - Forgot Password
    
    func forgotPassword(email: String) async throws {
        let _: [String: AnyCodable] = try await request("POST", path: "/auth/forgot-password", body: ["email": email], noAuth: true)
    }

    // MARK: - Account Deletion (App Store Guideline 5.1.1(v))

    /// Permanently delete the authenticated account and all associated data.
    /// Backend enforces password re-auth and the literal "DELETE MY ACCOUNT" confirmation.
    /// On success, performs a full local wipe (token + recordings + cached
    /// calendar data + temp files) to satisfy Apple Guideline 5.1.1(v).
    func deleteAccount(password: String) async throws {
        let _: [String: AnyCodable] = try await request(
            "POST",
            path: "/auth/delete-account",
            body: [
                "password": password,
                "confirmation": "DELETE MY ACCOUNT",
            ]
        )
        // logout() clears the keychain token, in-memory caches, the
        // Recordings/ directory, and the tmp directory.
        await MainActor.run { self.logout() }
    }
    
    // MARK: - Profile
    
    func updateProfile(body: [String: Any]) async throws -> User {
        try await request("PUT", path: "/auth/business/profile", body: body)
    }
    
    // MARK: - Calendar API
    
    func fetchCalendarEvents(startDate: String? = nil, endDate: String? = nil) async throws -> [APICalendarEvent] {
        var path = "/calendar/events"
        var params: [String] = []
        if let s = startDate { params.append("start_date=\(s)") }
        if let e = endDate { params.append("end_date=\(e)") }
        if !params.isEmpty { path += "?" + params.joined(separator: "&") }
        return try await request("GET", path: path)
    }
    
    func createCalendarEvent(body: [String: Any]) async throws -> APICalendarEvent {
        try await request("POST", path: "/calendar/events", body: body)
    }
    
    func deleteCalendarEvent(eventId: String) async throws {
        try await requestVoid("DELETE", path: "/calendar/events/\(eventId)")
    }
    
    func getCalendarStatus() async throws -> CalendarConnectionStatus {
        try await request("GET", path: "/calendar/status")
    }
}
