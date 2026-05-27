import Foundation

struct TaskItem: Codable, Identifiable {
    let id: String
    let user_id: String?
    let smart_note_id: String?
    let title: String
    let description: String?
    let status: String
    let priority: String?
    let due_date: String?
    let completed_at: String?
    let related_client_id: String?
    let assigned_to_id: String?
    let created_at: String?
    let updated_at: String?

    var dueDate: Date? {
        guard let d = due_date else { return nil }
        return ISO8601Flexible.parse(d)
    }

    var priorityLevel: Int {
        switch priority?.lowercased() {
        case "high": return 3
        case "medium": return 2
        case "low": return 1
        default: return 0
        }
    }
}

struct TaskCreate: Codable {
    let title: String
    let description: String?
    let status: String?
    let priority: String?
    let due_date: String?
    let related_client_id: String?
}

struct TaskUpdate: Codable {
    let title: String?
    let description: String?
    let status: String?
    let priority: String?
    let due_date: String?
    let related_client_id: String?
}
