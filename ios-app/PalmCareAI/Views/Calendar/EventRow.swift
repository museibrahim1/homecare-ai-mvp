import SwiftUI

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
