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
            .toolbarBackground(.hidden, for: .navigationBar)
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

    /// Clears the system nav bar fill/shadow so mint wash or dark glass
    /// runs edge-to-edge under the status bar (no white divider strip).
    func palmTransparentNavBar() -> some View {
        self
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbarBackground(.hidden, for: .tabBar)
            .background(PalmTransparentNavBarConfigurator())
    }
}

private struct PalmTransparentNavBarConfigurator: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> Controller {
        Controller()
    }

    func updateUIViewController(_ uiViewController: Controller, context: Context) {
        uiViewController.apply()
    }

    final class Controller: UIViewController {
        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            apply()
        }

        func apply() {
            guard let nav = navigationController else { return }
            let appearance = UINavigationBarAppearance()
            appearance.configureWithTransparentBackground()
            appearance.shadowColor = .clear
            appearance.shadowImage = UIImage()
            appearance.backgroundColor = .clear
            nav.navigationBar.standardAppearance = appearance
            nav.navigationBar.scrollEdgeAppearance = appearance
            nav.navigationBar.compactAppearance = appearance
            nav.navigationBar.isTranslucent = true
            nav.view.backgroundColor = .clear
        }
    }
}
