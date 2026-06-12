import UIKit

/// Re-enables the edge swipe-to-go-back gesture on every navigation stack.
///
/// SwiftUI disables the interactive pop gesture as soon as a screen sets
/// `navigationBarBackButtonHidden(true)` (which our custom `palmBackButton`
/// does). Taking over the recognizer's delegate restores the native
/// left-edge swipe everywhere while still guarding against a swipe at the
/// root view (which would otherwise freeze the stack).
extension UINavigationController: @retroactive UIGestureRecognizerDelegate {
    override open func viewDidLoad() {
        super.viewDidLoad()
        interactivePopGestureRecognizer?.delegate = self
    }

    public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        // Only allow the back-swipe when there's actually a screen to pop to.
        viewControllers.count > 1
    }
}
