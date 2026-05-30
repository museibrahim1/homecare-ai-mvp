import SwiftUI


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

#Preview {
    CalendarView()
        .environmentObject(APIService())
}
