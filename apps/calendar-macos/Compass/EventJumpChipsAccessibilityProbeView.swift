import AppKit
import CompassKit

/// AppKit mirror of `EventJumpChipsOverlay`. SwiftUI chip overlays are not
/// reliably exposed to XCUITest in CI; this probe carries the same identifiers.
@MainActor
final class EventJumpChipsAccessibilityProbeView: AccessibilityProbeView {
    private var chipFields: [NSTextField] = []

    func update(hints: [EventJumpChipHint]) {
        chipFields.forEach { $0.removeFromSuperview() }
        chipFields = []

        if hints.isEmpty {
            isHidden = true
            setAccessibilityElement(false)
            setAccessibilityIdentifier(nil)
            setAccessibilityLabel(nil)
            return
        }

        isHidden = false
        setAccessibilityElement(true)
        setAccessibilityHidden(false)
        setAccessibilityIdentifier("compass-event-jump-chips")
        setAccessibilityRole(.group)
        setAccessibilityLabel("Event jump chips")

        var x: CGFloat = 0
        for hint in hints {
            let field = NSTextField(labelWithString: hint.label)
            field.setAccessibilityElement(true)
            field.setAccessibilityIdentifier("compass-event-jump-chip")
            field.setAccessibilityLabel(hint.label)
            field.setAccessibilityRole(.staticText)
            field.frame = NSRect(x: x, y: 0, width: max(28, field.intrinsicContentSize.width + 8), height: 22)
            addSubview(field)
            chipFields.append(field)
            x += field.frame.width + 6
        }
        setAccessibilityChildren(chipFields)
        frame = NSRect(x: 200, y: 200, width: max(x, 40), height: 24)
        syncAccessibilityFrame()
    }
}

@MainActor
enum EventJumpChipsAccessibilityProbe {
    private static weak var probe: EventJumpChipsAccessibilityProbeView?

    static func attach(to window: NSWindow) {
        guard let host = window.contentView else { return }
        attach(to: host)
    }

    static func attach(to hostView: NSView) {
        probe = AccessibilityProbeView.attach(existing: probe, to: hostView) {
            EventJumpChipsAccessibilityProbeView(frame: .zero)
        }
    }

    static func publish(hints: [EventJumpChipHint]) {
        if probe == nil, let window = NSApp.keyWindow ?? NSApp.mainWindow {
            attach(to: window)
        }
        guard let probe else { return }
        let wasInactive = probe.isHidden
        probe.update(hints: hints)
        if !hints.isEmpty {
            if wasInactive {
                NSAccessibility.post(element: probe, notification: .created)
            }
            NSAccessibility.post(element: probe, notification: .focusedUIElementChanged)
        } else if !wasInactive {
            NSAccessibility.post(element: probe, notification: .uiElementDestroyed)
        }
        probe.postLayoutChanged()
    }
}
