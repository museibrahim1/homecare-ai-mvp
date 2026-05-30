import SwiftUI

// MARK: - Local Event Store

@MainActor
class EventStore: ObservableObject {
    @Published var events: [CalendarEvent] = []

    /// Encrypted-at-rest cache file in the Documents directory. Written with
    /// FileProtectionType.complete so iOS only decrypts it while the device
    /// is unlocked. UserDefaults was previously used here, which stores plist
    /// data unencrypted in the app sandbox — not appropriate for PHI.
    private static let cacheFilename = "palmcare_calendar.cache"

    private static var cacheURL: URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
            .first?.appendingPathComponent(cacheFilename)
    }

    init() {
        migrateFromUserDefaultsIfNeeded()
        load()
    }

    func load() {
        guard let url = Self.cacheURL,
              FileManager.default.fileExists(atPath: url.path),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([CalendarEvent].self, from: data)
        else { return }
        events = decoded
    }

    func save() {
        guard let url = Self.cacheURL,
              let data = try? JSONEncoder().encode(events) else { return }
        try? data.write(to: url, options: [.atomic, .completeFileProtection])
    }

    private func migrateFromUserDefaultsIfNeeded() {
        let legacyKey = "palmcare_calendar_events"
        guard let legacyData = UserDefaults.standard.data(forKey: legacyKey),
              let decoded = try? JSONDecoder().decode([CalendarEvent].self, from: legacyData)
        else { return }
        events = decoded
        save()
        UserDefaults.standard.removeObject(forKey: legacyKey)
    }

    func add(_ event: CalendarEvent) {
        events.append(event)
        save()
    }

    func delete(id: String) {
        events.removeAll { $0.id == id }
        save()
    }

    func events(on date: Date, calendar: Calendar = .current) -> [CalendarEvent] {
        events
            .filter { calendar.isDate($0.startDate, inSameDayAs: date) }
            .sorted { $0.startDate < $1.startDate }
    }

    func hasEvents(on date: Date, calendar: Calendar = .current) -> Bool {
        events.contains { calendar.isDate($0.startDate, inSameDayAs: date) }
    }
}
