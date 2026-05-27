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
