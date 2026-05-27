import Foundation

struct VisitNote: Codable, Identifiable {
    let id: String
    let visit_id: String?
    let narrative: String?
    let structured_data: NoteStructuredData?
    let created_at: String?
    let updated_at: String?
}

struct NoteStructuredData: Codable {
    let subjective: String?
    let objective: String?
    let assessment: String?
    let plan: String?
    let tasks_performed: [AnyCodable]?
    let visit_info: [String: AnyCodable]?
    let client_mood: String?
    let cognitive_status: String?
    let safety_observations: String?
    let next_visit_plan: String?

    var tasksAsStrings: [String] {
        guard let tasks = tasks_performed else { return [] }
        return tasks.compactMap { item -> String? in
            if let str = item.value as? String { return str }
            if let dict = item.value as? [String: Any] {
                let task = dict["task"] as? String ?? ""
                let details = dict["details"] as? String ?? ""
                return details.isEmpty ? task : "\(task): \(details)"
            }
            return nil
        }
    }
}
