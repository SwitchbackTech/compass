import AppKit
import CompassData
import CompassKit

/// Keeps the main window at web parity dimensions during XCUITest PNG export.
enum ParityCaptureWindowPolicy {
    private static let contentSize = NSSize(
        width: ParityCaptureGeometry.viewportWidth,
        height: ParityCaptureGeometry.viewportHeight
    )

    @MainActor
    static func applyIfNeeded(to window: NSWindow?) {
        guard UITestLaunchPolicy.isParityCapture, let window else { return }
        if abs(window.contentLayoutRect.width - contentSize.width) > 1
            || abs(window.contentLayoutRect.height - contentSize.height) > 1
        {
            window.setContentSize(contentSize)
            window.center()
        }
    }

    @MainActor
    static func scheduleReapply(to window: NSWindow?) {
        guard UITestLaunchPolicy.isParityCapture, window != nil else { return }
        applyIfNeeded(to: window)
        DispatchQueue.main.async {
            applyIfNeeded(to: window)
        }
    }
}
