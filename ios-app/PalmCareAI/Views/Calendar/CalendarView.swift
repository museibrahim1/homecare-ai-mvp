import SwiftUI

// MARK: - Local Event Store

@MainActor
class EventStore: ObservableObject {
    @Published var events: [CalendarEvent] = []

    private let storageKey = "palmcare_calendar_events"

    init() { load() }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([CalendarEvent].self, from: data)
        else { return }
        events = decoded
    }

    func save() {
        if let data = try? JSONEncoder().encode(events) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
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

// MARK: - Calendar View

struct CalendarView: View {
    @StateObject private var store = EventStore()
    @EnvironmentObject var api: APIService
    @AppStorage("googleCalendarConnected") private var googleCalConnected = false
    @State private var apiEvents: [APICalendarEvent] = []

    @State private var selectedDate = Date()
    @State private var displayedMonth = Date()
    @State private var showAddEvent = false
    @State private var syncError: String?

    private let cal = Calendar.current
    private let weekdaySymbols = Calendar.current.shortWeekdaySymbols

    private let dayFmt: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "d"; return f
    }()
    private let monthYearFmt: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "MMMM yyyy"; return f
    }()
    private let timeFmt: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "h:mm a"; return f
    }()
    private let dateLabelFmt: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "EEEE, MMM d"; return f
    }()
    private let dayCellLabelFmt: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "d MMM"; return f
    }()

    var body: some View {
        VStack(spacing: 0) {
            monthHeader
            weekdayHeader
            calendarGrid
            Divider().padding(.horizontal, 18)
            eventsList
        }
        .background(Color.palmBackground)
        .task {
            if googleCalConnected {
                do {
                    apiEvents = try await api.fetchCalendarEvents()
                } catch {
                    syncError = "Calendar sync failed"
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Button { showAddEvent = true } label: {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 48, height: 48)
                    .background(
                        LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .cornerRadius(14)
                    .shadow(color: Color.palmPrimary.opacity(0.4), radius: 8, y: 4)
            }
            .accessibilityLabel("Add new event")
            .padding(.trailing, 18)
            .padding(.bottom, 100)
        }
        .sheet(isPresented: $showAddEvent) {
            AddEventSheet { event in
                store.add(event)
                if googleCalConnected {
                    Task {
                        do {
                            let isoFmt = ISO8601DateFormatter()
                            isoFmt.formatOptions = [.withInternetDateTime]
                            var body: [String: Any] = [
                                "title": event.title,
                                "start_time": isoFmt.string(from: event.startDate),
                                "end_time": isoFmt.string(from: event.endDate),
                            ]
                            if let desc = event.description { body["description"] = desc }
                            if let loc = event.location { body["location"] = loc }
                            let apiEvent = try await api.createCalendarEvent(body: body)
                            await MainActor.run { apiEvents.append(apiEvent) }
                        } catch {
                            // API sync failed; event saved locally
                        }
                    }
                }
            }
        }
    }

    // MARK: - Month Header

    private var monthHeader: some View {
        HStack {
            Button { shiftMonth(-1) } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                    .frame(width: 36, height: 36)
                    .background(Color.palmPrimary.opacity(0.08))
                    .cornerRadius(10)
            }
            .accessibilityLabel("Previous month")

            Spacer()

            VStack(spacing: 2) {
                Text(monthYearFmt.string(from: displayedMonth))
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.palmText)

                if !cal.isDate(displayedMonth, equalTo: Date(), toGranularity: .month) {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            displayedMonth = Date()
                            selectedDate = Date()
                        }
                    } label: {
                        Text("Today")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                    }
                }
            }

            Spacer()

            Button { shiftMonth(1) } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                    .frame(width: 36, height: 36)
                    .background(Color.palmPrimary.opacity(0.08))
                    .cornerRadius(10)
            }
            .accessibilityLabel("Next month")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    // MARK: - Weekday Header

    private var weekdayHeader: some View {
        HStack(spacing: 0) {
            ForEach(weekdaySymbols, id: \.self) { symbol in
                Text(symbol.prefix(2).uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.palmSecondary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    // MARK: - Calendar Grid

    private var calendarGrid: some View {
        let days = daysInMonth()
        let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)

        return LazyVGrid(columns: columns, spacing: 4) {
            ForEach(Array(days.enumerated()), id: \.offset) { _, date in
                if let date = date {
                    dayCell(date)
                } else {
                    Color.clear.frame(height: 42)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 12)
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    private func dayCell(_ date: Date) -> some View {
        let isSelected = cal.isDate(date, inSameDayAs: selectedDate)
        let isToday = cal.isDateInToday(date)
        let hasLocalEvt = store.hasEvents(on: date, calendar: cal)
        let hasApiEvt = apiEvents.contains { event in
            if let d = ISO8601DateFormatter().date(from: event.start_time) {
                return cal.isDate(d, inSameDayAs: date)
            }
            return false
        }
        let hasEvt = hasLocalEvt || hasApiEvt

        let dateStr = dayCellLabelFmt.string(from: date)
        var hintParts: [String] = []
        if isSelected { hintParts.append("selected") }
        if isToday { hintParts.append("today") }
        if hasEvt { hintParts.append("has events") }
        let a11yLabel = hintParts.isEmpty ? dateStr : "\(dateStr), \(hintParts.joined(separator: ", "))"

        return Button {
            withAnimation(.easeInOut(duration: 0.15)) { selectedDate = date }
        } label: {
            VStack(spacing: 2) {
                Text(dayFmt.string(from: date))
                    .font(.system(size: 14, weight: isSelected || isToday ? .bold : .regular))
                    .foregroundColor(
                        isSelected ? .white :
                        isToday ? .palmPrimary :
                        .palmText
                    )
                    .frame(width: 34, height: 34)
                    .background(
                        isSelected ? Color.palmPrimary :
                        isToday ? Color.palmPrimary.opacity(0.1) :
                        Color.clear
                    )
                    .cornerRadius(10)

                Circle()
                    .fill(hasEvt ? Color.palmPrimary : Color.clear)
                    .frame(width: 5, height: 5)
            }
            .frame(height: 42)
        }
        .accessibilityLabel(a11yLabel)
    }

    // MARK: - Events List

    private var eventsList: some View {
        let localEvents = store.events(on: selectedDate, calendar: cal)
        let apiDayEvents = apiEvents.filter { event in
            if let date = ISO8601DateFormatter().date(from: event.start_time) {
                return cal.isDate(date, inSameDayAs: selectedDate)
            }
            return false
        }
        let dayEvents = localEvents + apiDayEvents.map { apiEvt in
            CalendarEvent(
                id: apiEvt.id,
                title: apiEvt.title,
                description: apiEvt.description,
                startDate: ISO8601DateFormatter().date(from: apiEvt.start_time) ?? Date(),
                endDate: ISO8601DateFormatter().date(from: apiEvt.end_time) ?? Date(),
                location: apiEvt.location
            )
        }

        return VStack(alignment: .leading, spacing: 0) {
            if let syncError = syncError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.icloud.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.palmOrange)
                    Text(syncError)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmOrange)
                    Spacer()
                    Button {
                        self.syncError = nil
                        Task {
                            do {
                                apiEvents = try await api.fetchCalendarEvents()
                            } catch {
                                self.syncError = "Calendar sync failed"
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 10, weight: .bold))
                            Text("Retry")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundColor(.palmPrimary)
                    }
                    Button {
                        withAnimation { self.syncError = nil }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.palmSecondary)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.palmOrange.opacity(0.08))
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmOrange.opacity(0.2), lineWidth: 1))
                .padding(.horizontal, 18)
                .padding(.top, 10)
            }

            HStack {
                Text(dateLabelFmt.string(from: selectedDate))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.palmText)
                Spacer()
                Text("\(dayEvents.count) event\(dayEvents.count == 1 ? "" : "s")")
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
            }
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 8)

            if dayEvents.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 32))
                        .foregroundColor(.palmSecondary.opacity(0.4))
                    Text("No events")
                        .font(.system(size: 14))
                        .foregroundColor(.palmSecondary)
                    Button {
                        showAddEvent = true
                    } label: {
                        Text("Add Event")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                    }
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 30)
                Spacer()
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        ForEach(dayEvents) { event in
                            EventRow(event: event, timeFmt: timeFmt)
                                .contextMenu {
                                    Button(role: .destructive) {
                                        let isApiEvent = apiEvents.contains { $0.id == event.id }
                                        if isApiEvent {
                                            Task {
                                                try? await api.deleteCalendarEvent(eventId: event.id)
                                                await MainActor.run {
                                                    withAnimation { apiEvents.removeAll { $0.id == event.id } }
                                                }
                                            }
                                        } else {
                                            withAnimation { store.delete(id: event.id) }
                                        }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 120)
                }
            }
        }
    }

    // MARK: - Helpers

    private func shiftMonth(_ delta: Int) {
        if let m = cal.date(byAdding: .month, value: delta, to: displayedMonth) {
            withAnimation(.easeInOut(duration: 0.2)) { displayedMonth = m }
        }
    }

    private func daysInMonth() -> [Date?] {
        guard let range = cal.range(of: .day, in: .month, for: displayedMonth),
              let firstDay = cal.date(from: cal.dateComponents([.year, .month], from: displayedMonth))
        else { return [] }

        let weekday = cal.component(.weekday, from: firstDay)
        let leading = weekday - cal.firstWeekday
        let blanks = leading < 0 ? leading + 7 : leading

        var days: [Date?] = Array(repeating: nil, count: blanks)
        for day in range {
            if let d = cal.date(byAdding: .day, value: day - 1, to: firstDay) {
                days.append(d)
            }
        }
        return days
    }
}

// MARK: - Event Row

struct EventRow: View {
    let event: CalendarEvent
    let timeFmt: DateFormatter

    private static let barColors: [Color] = [.palmPrimary, .palmBlue, .palmOrange, .palmPurple, .palmGreen]

    var body: some View {
        let colorIndex = abs(event.title.hashValue) % Self.barColors.count
        let barColor = Self.barColors[colorIndex]

        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2)
                .fill(barColor)
                .frame(width: 4, height: 44)

            VStack(alignment: .leading, spacing: 3) {
                Text(event.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text("\(timeFmt.string(from: event.startDate)) – \(timeFmt.string(from: event.endDate))")
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)

                    if let loc = event.location, !loc.isEmpty {
                        Text("·")
                            .foregroundColor(.palmSecondary)
                        Text(loc)
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            if let desc = event.description, !desc.isEmpty {
                Image(systemName: "text.alignleft")
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary.opacity(0.5))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint("Long press for options")
    }

    private var accessibilityLabel: String {
        let timeRange = "\(timeFmt.string(from: event.startDate)) to \(timeFmt.string(from: event.endDate))"
        if let loc = event.location, !loc.isEmpty {
            return "\(event.title), \(timeRange), \(loc)"
        }
        return "\(event.title), \(timeRange)"
    }
}

// MARK: - Add Event Sheet

struct AddEventSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (CalendarEvent) -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var startTime = Date()
    @State private var endTime = Date().addingTimeInterval(3600)
    @State private var location = ""
    @State private var selectedColor = 0

    private let colorOptions: [(String, Color)] = [
        ("Teal", .palmPrimary),
        ("Blue", .palmBlue),
        ("Orange", .palmOrange),
        ("Purple", .palmPurple),
        ("Green", .palmGreen)
    ]

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerIcon

                    VStack(spacing: 16) {
                        eventField(label: "Event Name", required: true) {
                            TextField("Team standup, Client visit...", text: $title)
                                .font(.system(size: 14))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        eventField(label: "Description") {
                            TextField("Add details...", text: $description, axis: .vertical)
                                .font(.system(size: 14))
                                .lineLimit(2...4)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        eventField(label: "Location") {
                            HStack(spacing: 8) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.palmSecondary)
                                TextField("Office, Zoom, Client home...", text: $location)
                                    .font(.system(size: 14))
                                    .textContentType(.fullStreetAddress)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(10)
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        timeSection

                        colorPicker
                    }
                    .padding(.horizontal, 20)

                    saveButton
                        .padding(.horizontal, 20)
                        .padding(.bottom, 30)
                }
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("New Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.palmSecondary)
                }
            }
        }
    }

    private var headerIcon: some View {
        VStack(spacing: 4) {
            Circle()
                .fill(
                    LinearGradient(colors: [Color.palmPrimary, Color.palmAccent],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .frame(width: 56, height: 56)
                .overlay(
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                )

            Text("New Event")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.palmText)
        }
    }

    private var timeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Time")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.palmSecondary)

            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "clock")
                        .font(.system(size: 14))
                        .foregroundColor(.palmPrimary)
                        .frame(width: 28)
                    Text("Start")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.palmText)
                    Spacer()
                    DatePicker("", selection: $startTime)
                        .labelsHidden()
                        .tint(.palmPrimary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)

                Rectangle()
                    .fill(Color.palmBorder.opacity(0.5))
                    .frame(height: 1)
                    .padding(.leading, 56)

                HStack {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.palmOrange)
                        .frame(width: 28)
                    Text("End")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.palmText)
                    Spacer()
                    DatePicker("", selection: $endTime)
                        .labelsHidden()
                        .tint(.palmPrimary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    private var colorPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Color")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.palmSecondary)

            HStack(spacing: 10) {
                ForEach(Array(colorOptions.enumerated()), id: \.offset) { index, option in
                    Button {
                        selectedColor = index
                    } label: {
                        Circle()
                            .fill(option.1)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: selectedColor == index ? 2 : 0)
                            )
                            .overlay(
                                Circle()
                                    .stroke(option.1, lineWidth: selectedColor == index ? 2 : 0)
                                    .padding(-3)
                            )
                            .overlay(
                                selectedColor == index
                                    ? Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                    : nil
                            )
                    }
                }
                Spacer()
            }
        }
    }

    private var saveButton: some View {
        Button {
            let event = CalendarEvent(
                title: title.trimmingCharacters(in: .whitespaces),
                description: description.isEmpty ? nil : description,
                startDate: startTime,
                endDate: endTime,
                location: location.isEmpty ? nil : location
            )
            onSave(event)
            dismiss()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 14, weight: .bold))
                Text("Add Event")
                    .font(.system(size: 15, weight: .bold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                               startPoint: .leading, endPoint: .trailing)
                .opacity(canSave ? 1 : 0.5)
            )
            .cornerRadius(12)
        }
        .disabled(!canSave)
    }

    @ViewBuilder
    private func eventField<Content: View>(label: String, required: Bool = false, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmSecondary)
                if required {
                    Text("*")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.red)
                }
            }
            content()
        }
    }
}

#Preview {
    CalendarView()
        .environmentObject(APIService())
}
