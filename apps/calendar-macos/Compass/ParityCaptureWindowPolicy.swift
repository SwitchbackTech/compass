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
        let visible = window.screen?.visibleFrame ?? NSScreen.main?.visibleFrame
        var target = contentSize
        if let visible {
            target.width = min(target.width, visible.width - 8)
            target.height = min(target.height, visible.height - 8)
        }
        let contentRect = NSRect(origin: .zero, size: target)
        let frame = window.frameRect(forContentRect: contentRect)
        if abs(window.frame.width - frame.width) > 2 || abs(window.frame.height - frame.height) > 2 {
            var origin = frame.origin
            if let visible {
                origin.x = visible.midX - frame.width / 2
                origin.y = visible.midY - frame.height / 2
            }
            window.setFrame(NSRect(origin: origin, size: frame.size), display: true)
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
