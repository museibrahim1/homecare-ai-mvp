import SwiftUI

/// Subtle custom back chevron that replaces the bulky system circle on
/// screens where it clashes with the design (auth flow).
struct PalmBackButtonModifier: ViewModifier {
    @Environment(\.dismiss) private var dismiss
    /// Tint for dark backgrounds (white chevron) vs light (label color).
    var darkBackground: Bool = false

    func body(content: Content) -> some View {
        content
            .navigationBarBackButtonHidden(true)
            .toolbar {
                // On iOS 26 the system wraps toolbar items in a Liquid Glass
                // circle — hide it so the chevron stays quiet and seamless.
                if #available(iOS 26.0, *) {
                    ToolbarItem(placement: .topBarLeading) { backButton }
                        .sharedBackgroundVisibility(.hidden)
                } else {
                    ToolbarItem(placement: .topBarLeading) { backButton }
                }
            }
    }

    private var backButton: some View {
        Button { dismiss() } label: {
            Image(systemName: "chevron.left")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(darkBackground ? .white.opacity(0.8) : .secondary)
                .frame(width: 32, height: 32)
                .contentShape(Circle())
        }
        .accessibilityLabel("Back")
    }
}

extension View {
    func palmBackButton(darkBackground: Bool = false) -> some View {
        modifier(PalmBackButtonModifier(darkBackground: darkBackground))
    }
}
