import Foundation
import UIKit

// MARK: - Support Ticket Models

struct SupportTicketSummary: Codable, Identifiable {
    let id: String
    let ticket_number: String
    let subject: String
    let category: String
    let status: String
    let created_at: String

    var displayStatus: String {
        status.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

struct SupportTicketReply: Codable, Identifiable {
    let id: String
    let message: String
    let from_support: Bool
    let created_at: String
}

struct SupportTicketDetail: Codable, Identifiable {
    let id: String
    let ticket_number: String
    let subject: String
    let description: String
    let category: String
    let status: String
    let created_at: String
    let updated_at: String?
    let resolution: String?
    let replies: [SupportTicketReply]

    var displayStatus: String {
        status.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

// MARK: - Support Ticket API

extension APIService {
    func createSupportTicket(subject: String, description: String, category: String) async throws -> SupportTicketDetail {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
        return try await request("POST", path: "/support/tickets", body: [
            "subject": subject,
            "description": description,
            "category": category,
            "app_version": version,
            "platform": "iOS \(UIDevice.current.systemVersion)",
        ])
    }

    func fetchSupportTickets() async throws -> [SupportTicketSummary] {
        try await request("GET", path: "/support/tickets")
    }

    func fetchSupportTicket(id: String) async throws -> SupportTicketDetail {
        try await request("GET", path: "/support/tickets/\(id)")
    }

    func replyToSupportTicket(id: String, message: String) async throws -> SupportTicketDetail {
        try await request("POST", path: "/support/tickets/\(id)/replies", body: [
            "message": message,
        ])
    }
}
