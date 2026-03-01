import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var api: APIService

    @State private var events: [CalendarEvent] = []
    @State private var selectedDate = Date()
    @State private var displayedMonth = Date()
    @State private var isLoading = true
    @State private var showAddEvent = false
    @State private var errorMessage: String?
    @State private var calendarNotConnected = false

    private let calendar = Calendar.current
    private let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f
    }()
    private let monthYearFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f
    }()
    private let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()
    private let weekdaySymbols = Calendar.current.shortWeekdaySymbols

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if calendarNotConnected {
                    calendarNotConnectedView
                } else {
                    monthHeader
                    weekdayHeader
                    calendarGrid
                    Divider().padding(.horizontal, 18)
                    eventsList
                }
            }
            .background(Color.palmBackground)
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !calendarNotConnected {
                        Button { showAddEvent = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 22))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                }
            }
            .sheet(isPresented: $showAddEvent) {
                AddEventSheet(onSave: { event in
                    Task {
                        do {
                            let created = try await api.createCalendarEvent(event)
                            await MainActor.run { events.append(created) }
                        } catch {}
                    }
                })
            }
            .task { await loadEvents() }
        }
    }

    private var calendarNotConnectedView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 48))
                .foregroundColor(.palmSecondary.opacity(0.5))

            Text("Google Calendar Not Connected")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.palmText)

            Text("Connect your Google Calendar from the web app to sync your events here.")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary.opacity(0.6))
                    .padding(.top, 4)
            }

            Button {
                Task { await loadEvents() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                    Text("Retry")
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmPrimary)
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color.palmPrimary.opacity(0.1))
                .cornerRadius(10)
            }
            .padding(.top, 8)

            Spacer()
        }
        .frame(maxWidth: .infinity)
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

            Text(monthYearFormatter.string(from: displayedMonth))
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.palmText)

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
            ForEach(days, id: \.self) { date in
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
        let isSelected = calendar.isDate(date, inSameDayAs: selectedDate)
        let isToday = calendar.isDateInToday(date)
        let hasEvents = eventsForDate(date).count > 0

        return Button { selectedDate = date } label: {
            VStack(spacing: 2) {
                Text(dayFormatter.string(from: date))
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
                    .fill(hasEvents ? Color.palmPrimary : Color.clear)
                    .frame(width: 5, height: 5)
            }
            .frame(height: 42)
        }
    }

    // MARK: - Events List

    private var eventsList: some View {
        let dayEvents = eventsForDate(selectedDate)
        let dateStr: String = {
            let f = DateFormatter()
            f.dateFormat = "EEEE, MMM d"
            return f.string(from: selectedDate)
        }()

        return VStack(alignment: .leading, spacing: 0) {
            Text(dateStr)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.palmText)
                .padding(.horizontal, 18)
                .padding(.top, 14)
                .padding(.bottom, 8)

            if isLoading {
                VStack {
                    ProgressView()
                        .padding(.top, 30)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else if dayEvents.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 32))
                        .foregroundColor(.palmSecondary.opacity(0.4))
                    Text("No events")
                        .font(.system(size: 14))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 30)
                Spacer()
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        ForEach(dayEvents) { event in
                            EventRow(event: event, timeFormatter: timeFormatter)
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
        if let newMonth = calendar.date(byAdding: .month, value: delta, to: displayedMonth) {
            withAnimation(.easeInOut(duration: 0.2)) { displayedMonth = newMonth }
        }
    }

    private func daysInMonth() -> [Date?] {
        guard let range = calendar.range(of: .day, in: .month, for: displayedMonth),
              let firstDay = calendar.date(from: calendar.dateComponents([.year, .month], from: displayedMonth))
        else { return [] }

        let weekday = calendar.component(.weekday, from: firstDay)
        let leadingBlanks = weekday - calendar.firstWeekday
        let adjustedBlanks = leadingBlanks < 0 ? leadingBlanks + 7 : leadingBlanks

        var days: [Date?] = Array(repeating: nil, count: adjustedBlanks)
        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDay) {
                days.append(date)
            }
        }
        return days
    }

    private func eventsForDate(_ date: Date) -> [CalendarEvent] {
        events.filter { event in
            guard let eventDate = event.startDate else { return false }
            return calendar.isDate(eventDate, inSameDayAs: date)
        }
    }

    private func loadEvents() async {
        await MainActor.run {
            isLoading = true
            calendarNotConnected = false
            errorMessage = nil
        }
        do {
            let fetched = try await api.fetchCalendarEvents()
            await MainActor.run {
                events = fetched
                isLoading = false
            }
        } catch let apiError as APIError {
            await MainActor.run {
                isLoading = false
                calendarNotConnected = true
                errorMessage = apiError.localizedDescription
            }
        } catch {
            await MainActor.run {
                isLoading = false
                calendarNotConnected = true
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Event Row

struct EventRow: View {
    let event: CalendarEvent
    let timeFormatter: DateFormatter

    private static let barColors: [Color] = [.palmPrimary, .palmBlue, .palmOrange, .palmPurple, .palmGreen]

    var body: some View {
        let colorIndex = abs((event.title).hashValue) % Self.barColors.count
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
                    if let start = event.startDate, let end = event.endDate {
                        Text("\(timeFormatter.string(from: start)) – \(timeFormatter.string(from: end))")
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                    }
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
    let onSave: (CalendarEventCreate) -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var startTime = Date()
    @State private var endTime = Date().addingTimeInterval(3600)
    @State private var location = ""

    private let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    var body: some View {
        NavigationStack {
            Form {
                Section("Event Details") {
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $description)
                    TextField("Location (optional)", text: $location)
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
                        let event = CalendarEventCreate(
                            title: title,
                            description: description.isEmpty ? nil : description,
                            start_time: isoFormatter.string(from: startTime),
                            end_time: isoFormatter.string(from: endTime),
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
