import SwiftUI

// MARK: - Reusable Settings Components

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.7)
                .foregroundColor(.palmSecondary)
                .padding(.leading, 6)
                .padding(.bottom, 10)

            VStack(spacing: 0) {
                content
            }
            .palmGlassCard(radius: 22, fillOpacity: 0.62)
        }
    }
}

struct SettingsNavRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    var detail: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            SettingsIcon(systemName: icon, color: iconColor)

            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmText)

            Spacer()

            if let detail = detail {
                Text(detail)
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmBorder)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

struct SettingsToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: 12) {
            SettingsIcon(systemName: icon, color: iconColor)

            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmText)

            Spacer()

            Toggle("", isOn: $isOn)
                .tint(.palmPrimary)
                .labelsHidden()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .accessibilityLabel(title)
    }
}

struct SettingsIcon: View {
    let systemName: String
    let color: Color

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(color)
            .frame(width: 32, height: 32)
            .background(color.opacity(0.1))
            .cornerRadius(8)
    }
}

struct SettingsDivider: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Rectangle()
            .fill(
                colorScheme == .dark
                    ? Color.palmNightGlassBorder
                    : Color.palmBorder.opacity(0.5)
            )
            .frame(height: 1)
            .padding(.leading, 58)
    }
}

// MARK: - Change Password Sheet
