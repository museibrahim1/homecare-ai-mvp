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

    /// Update the signed-in user's own name/phone via `PUT /auth/me`.
    func updateProfile(body: [String: Any]) async throws -> User {
        let user: User = try await request("PUT", path: "/auth/me", body: body)
        cachedUser = CacheEntry(value: user, timestamp: Date())
        return user
    }
    
    // MARK: - Calendar API

    /// Fetch Google Calendar events from 30 days back to 90 days ahead.
    /// The backend proxies Google's raw list, so map each item into our
    /// own event shape and drop anything without a start time.
    func fetchCalendarEvents() async throws -> [APICalendarEvent] {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        let timeMin = iso.string(from: Date().addingTimeInterval(-30 * 86400))
        let timeMax = iso.string(from: Date().addingTimeInterval(90 * 86400))
        let response: GoogleEventsResponse = try await request(
            "GET", path: "/calendar/events?time_min=\(timeMin)&time_max=\(timeMax)"
        )
        return response.events.compactMap { $0.asAPIEvent }
    }

    /// Create a Google Calendar event. Returns the new Google event ID.
    func createCalendarEvent(body: [String: Any]) async throws -> String {
        let response: CalendarCreateResponse = try await request("POST", path: "/calendar/events", body: body)
        return response.event_id
    }
    
    func deleteCalendarEvent(eventId: String) async throws {
        try await requestVoid("DELETE", path: "/calendar/events/\(eventId)")
    }
    
    func getCalendarStatus() async throws -> CalendarConnectionStatus {
        try await request("GET", path: "/calendar/status")
    }
}
