import Foundation

extension APIService {
    func fetchWeeklyPlan(weekOffset: Int = 0) async throws -> OutreachWeeklyPlan {
        try await request("GET", path: "/platform/outreach/weekly-plan?week_offset=\(weekOffset)")
    }

    func approveDraft(draftId: String, type: String) async throws {
        let draftRes: DraftResponse = try await request(
            "POST", path: "/platform/outreach/generate-draft",
            body: ["target_type": type, "target_id": draftId] as [String: Any]
        )
        try await requestVoid("POST", path: "/platform/outreach/approve-draft/\(draftRes.draft_id)")
    }

    func markCalled(leadId: String, notes: String?) async throws {
        var body: [String: Any] = [:]
        if let notes = notes, !notes.isEmpty { body["notes"] = notes }
        let _: [String: AnyCodable] = try await request(
            "POST", path: "/platform/outreach/mark-called/\(leadId)",
            body: body.isEmpty ? nil : body
        )
    }

    func batchSendEmails(dayIndex: Int, weekOffset: Int = 0) async throws -> BatchSendResponse {
        try await request("POST", path: "/platform/outreach/batch-send", body: [
            "day_index": dayIndex,
            "week_offset": weekOffset,
            "types": ["agency", "investor"]
        ] as [String: Any])
    }

    func fetchSalesLeads(page: Int = 0, limit: Int = 50) async throws -> [SalesLead] {
        try await request("GET", path: "/platform/sales/leads?skip=\(page * limit)&limit=\(limit)")
    }

    func fetchInvestors() async throws -> [InvestorRecord] {
        try await request("GET", path: "/platform/investors/")
    }

    // MARK: - Logout

    func logout() {
        token = nil

        // Clear any cached PHI from UserDefaults (legacy keys + new ones).
        let defaults = UserDefaults.standard
        for key in [
            "palmcare_calendar_events",
            "googleCalendarConnected",
            "cachedClients",
            "cachedVisits",
            "lastSyncedAt",
        ] {
            defaults.removeObject(forKey: key)
        }
        URLCache.shared.removeAllCachedResponses()

        let fm = FileManager.default

        // Wipe the encrypted calendar cache file (see CalendarStorage).
        if let docsDir = fm.urls(for: .documentDirectory, in: .userDomainMask).first {
            for name in ["palmcare_calendar.cache", "calendar_events.json"] {
                let url = docsDir.appendingPathComponent(name)
                if fm.fileExists(atPath: url.path) {
                    try? fm.removeItem(at: url)
                }
            }
        }

        // Recordings directory (PHI audio).
        let recordingsDir = fm.urls(for: .documentDirectory, in: .userDomainMask).first?.appendingPathComponent("Recordings")
        if let dir = recordingsDir, fm.fileExists(atPath: dir.path) {
            try? fm.removeItem(at: dir)
        }

        // Tmp directory (export sheets, chunked audio, etc.).
        let tmpDir = fm.temporaryDirectory
        if let files = try? fm.contentsOfDirectory(atPath: tmpDir.path) {
            for file in files {
                try? fm.removeItem(at: tmpDir.appendingPathComponent(file))
            }
        }
    }
}
