import Foundation

/// A recording that failed to upload (or never started) and must stay on device
/// until the caregiver retries or reconnects. PHI hygiene: purge at 48h still
/// applies unless the file is listed here as actively queued.
struct PendingUpload: Codable, Identifiable, Equatable {
    let id: String
    /// Absolute path at enqueue time. Prefer resolving via filename under Recordings/.
    let audioPath: String
    let clientId: String
    var clientName: String?
    let createdAt: Date
    var attemptCount: Int
    var lastError: String?
    /// Set after createVisit succeeds so a retry does not open a second visit.
    var visitId: String?

    var audioURL: URL {
        URL(fileURLWithPath: audioPath)
    }

    var filename: String {
        audioURL.lastPathComponent
    }

    /// Prefer the live Recordings/ location if the sandbox container moved.
    func resolvedAudioURL() -> URL? {
        let direct = audioURL
        if FileManager.default.fileExists(atPath: direct.path) {
            return direct
        }
        guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return nil
        }
        let fallback = documents
            .appendingPathComponent("Recordings", isDirectory: true)
            .appendingPathComponent(filename)
        return FileManager.default.fileExists(atPath: fallback.path) ? fallback : nil
    }
}

/// Persists failed / interrupted assessment uploads across launches.
@MainActor
final class PendingUploadStore: ObservableObject {
    static let shared = PendingUploadStore()

    @Published private(set) var items: [PendingUpload] = []

    private let fileURL: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(fileManager: FileManager = .default) {
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory())
        fileURL = documents.appendingPathComponent("pending_uploads.json")
        encoder.dateEncodingStrategy = .secondsSince1970
        decoder.dateDecodingStrategy = .secondsSince1970
        load()
    }

    var hasItems: Bool { !items.isEmpty }

    func item(id: String) -> PendingUpload? {
        items.first { $0.id == id }
    }

    func upsert(_ item: PendingUpload) {
        if let idx = items.firstIndex(where: { $0.id == item.id }) {
            items[idx] = item
        } else if let idx = items.firstIndex(where: { $0.audioPath == item.audioPath }) {
            items[idx] = item
        } else {
            items.append(item)
        }
        persist()
    }

    func update(id: String, mutate: (inout PendingUpload) -> Void) {
        guard let idx = items.firstIndex(where: { $0.id == id }) else { return }
        mutate(&items[idx])
        persist()
    }

    func remove(id: String) {
        items.removeAll { $0.id == id }
        persist()
    }

    func remove(audioURL: URL) {
        items.removeAll { $0.audioPath == audioURL.path || $0.filename == audioURL.lastPathComponent }
        persist()
    }

    /// Filenames that must not be deleted by the 48h PHI purge while queued.
    nonisolated static func protectedFilenames() -> Set<String> {
        guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return []
        }
        let url = documents.appendingPathComponent("pending_uploads.json")
        guard let data = try? Data(contentsOf: url) else { return [] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        guard let decoded = try? decoder.decode([PendingUpload].self, from: data) else {
            return []
        }
        return Set(decoded.map(\.filename))
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? decoder.decode([PendingUpload].self, from: data) else {
            items = []
            return
        }
        // Drop entries whose audio file is already gone.
        items = decoded.filter { $0.resolvedAudioURL() != nil }
        if items.count != decoded.count {
            persist()
        }
    }

    private func persist() {
        do {
            let data = try encoder.encode(items)
            try data.write(to: fileURL, options: [.atomic])
        } catch {
            // Persistence failure must not crash recording; in-memory queue still works.
            print("[PendingUploadStore] persist failed: \(error.localizedDescription)")
        }
    }
}
