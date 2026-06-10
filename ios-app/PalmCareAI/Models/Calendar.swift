import Foundation

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

// MARK: - Google Calendar wire format

/// `GET /calendar/events` proxies Google's raw event list:
/// `{"events": [{id, summary, start: {dateTime|date}, ...}]}`.
struct GoogleEventsResponse: Decodable {
    let events: [GoogleCalendarItem]
}

struct GoogleCalendarItem: Decodable {
    struct EventTime: Decodable {
        let dateTime: String?
        let date: String?  // all-day events
    }

    let id: String
    let summary: String?
    let description: String?
    let location: String?
    let start: EventTime?
    let end: EventTime?

    var asAPIEvent: APICalendarEvent? {
        guard let startTime = start?.dateTime ?? start?.date else { return nil }
        return APICalendarEvent(
            id: id,
            title: summary ?? "Untitled event",
            description: description,
            start_time: startTime,
            end_time: end?.dateTime ?? end?.date ?? startTime,
            location: location,
            google_event_id: id,
            created_at: nil
        )
    }
}

/// `POST /calendar/events` returns `{success, event_id, html_link}`.
struct CalendarCreateResponse: Decodable {
    let success: Bool
    let event_id: String
}

struct CalendarConnectionStatus: Codable {
    let connected: Bool
    let email: String?
    let calendar_id: String?
}

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
