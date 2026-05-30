import SwiftUI

// MARK: - Reusable Settings Components

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmSecondary)
                .padding(.leading, 4)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
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
    var body: some View {
        Rectangle()
            .fill(Color.palmBorder.opacity(0.5))
            .frame(height: 1)
            .padding(.leading, 58)
    }
}

// MARK: - Change Password Sheet
