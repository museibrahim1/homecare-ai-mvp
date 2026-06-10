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
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(darkBackground ? .white.opacity(0.8) : .secondary)
                            .frame(width: 30, height: 30)
                            .contentShape(Circle())
                    }
                    .accessibilityLabel("Back")
                }
            }
    }
}

extension View {
    func palmBackButton(darkBackground: Bool = false) -> some View {
        modifier(PalmBackButtonModifier(darkBackground: darkBackground))
    }
}
