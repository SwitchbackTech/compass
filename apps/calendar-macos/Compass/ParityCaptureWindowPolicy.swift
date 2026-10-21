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
        // Always use the canonical parity viewport so five day columns are not
        // clipped when the host display is smaller than 1280×820.
        let target = contentSize
        let contentRect = NSRect(origin: .zero, size: target)
        let frame = window.frameRect(forContentRect: contentRect)
        // minSize == maxSize already pins the window. Leave `.resizable` on so
        // the zoom (green) traffic light stays enabled, like the real window:
        // the title-bar reference capture must show a real green button.
        window.minSize = frame.size
        window.maxSize = frame.size
        let visible = window.screen?.visibleFrame ?? NSScreen.main?.visibleFrame
        var origin = frame.origin
        if let visible {
            origin.x = max(visible.minX, min(visible.maxX - frame.width, visible.midX - frame.width / 2))
            origin.y = max(visible.minY, visible.maxY - frame.height)
        }
        window.setFrame(NSRect(origin: origin, size: frame.size), display: true, animate: false)
        window.setContentSize(target)
        window.contentView?.setFrameSize(target)
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
