import SwiftUI

// MARK: - Local Event Store

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

    @State private var selectedDate = Date()
    @State private var displayedMonth = Date()
    @State private var showAddEvent = false

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

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                monthHeader
                weekdayHeader
                calendarGrid
                Divider().padding(.horizontal, 18)
                eventsList
            }
            .background(Color.palmBackground)
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showAddEvent = true } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.palmPrimary)
                    }
                }
            }
            .sheet(isPresented: $showAddEvent) {
                AddEventSheet { event in
                    store.add(event)
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
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(Color.white)
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
        .background(Color.white)
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
        .background(Color.white)
    }

    private func dayCell(_ date: Date) -> some View {
        let isSelected = cal.isDate(date, inSameDayAs: selectedDate)
        let isToday = cal.isDateInToday(date)
        let hasEvt = store.hasEvents(on: date, calendar: cal)

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
    }

    // MARK: - Events List

    private var eventsList: some View {
        let dayEvents = store.events(on: selectedDate, calendar: cal)

        return VStack(alignment: .leading, spacing: 0) {
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
                                        withAnimation { store.delete(id: event.id) }
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
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
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

    var body: some View {
        NavigationStack {
            Form {
                Section("Event Details") {
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $description)
                    TextField("Location (optional)", text: $location)
                        .textContentType(.fullStreetAddress)
                }

                Section("Time") {
                    DatePicker("Start", selection: $startTime)
                    DatePicker("End", selection: $endTime)
                }
            }
            .navigationTitle("New Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        let event = CalendarEvent(
                            title: title.trimmingCharacters(in: .whitespaces),
                            description: description.isEmpty ? nil : description,
                            startDate: startTime,
                            endDate: endTime,
                            location: location.isEmpty ? nil : location
                        )
                        onSave(event)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .font(.system(size: 15, weight: .bold))
                }
            }
        }
    }
}
