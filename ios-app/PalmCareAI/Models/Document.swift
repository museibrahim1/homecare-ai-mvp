import Foundation

struct DocumentItem: Codable, Identifiable {
    let id: String
    let name: String
    let type: String?
    let format: String?
    let size: String?
    let folder: String?
    let client_id: String?
    let client_name: String?
    let visit_id: String?
    let created_at: String?
    let download_url: String?
}

struct DocumentFolder: Codable {
    let id: Int
    let name: String
    let count: Int
    let icon: String?
}

struct DocumentsResponse: Codable {
    let documents: [DocumentItem]
    let total: Int
    let folders: [DocumentFolder]?
}
