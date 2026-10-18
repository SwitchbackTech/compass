import AppKit
import CompassData
import SwiftUI

struct SidebarResizeHandle: NSViewRepresentable {
    @Environment(\.nativeWebTheme) private var theme
    let width: Double
    let onResize: (Double) -> Void
    let onCommit: () -> Void

    func makeNSView(context: Context) -> SidebarResizeHandleControl {
        SidebarResizeHandleControl(frame: .zero)
    }

    func updateNSView(_ control: SidebarResizeHandleControl, context: Context) {
        control.doubleValue = width
        control.setAccessibilityValue(width)
        control.focusColor = NSColor(theme.accentColor)
        control.onResize = onResize
        control.onCommit = onCommit
        control.needsDisplay = true
    }
}

/// Owns its keys through AppKit, so grid shortcuts cannot consume divider input.
public final class SidebarResizeHandleControl: NSControl {
    var onResize: (Double) -> Void = { _ in }
    var onCommit: () -> Void = {}
    var focusColor = NSColor.keyboardFocusIndicatorColor
    private var dragOrigin: (x: CGFloat, width: Double)?

    public override init(frame: NSRect) {
        super.init(frame: frame)
        setAccessibilityElement(true)
        setAccessibilityRole(.splitter)
        setAccessibilityLabel("Resize sidebar")
        setAccessibilityOrientation(.vertical)
        setAccessibilityHelp("Use Left and Right to resize, Home for the minimum, End for the maximum, and Return to reset.")
        toolTip = "Drag to resize. Double-click or press Return to reset."
        setAccessibilityIdentifier("compass-native-sidebar-resize-handle")
        setAccessibilityMinValue(CompassDevicePreferences.sidebarWidthRange.lowerBound)
        setAccessibilityMaxValue(CompassDevicePreferences.sidebarWidthRange.upperBound)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    public override var acceptsFirstResponder: Bool { true }
    public override func becomeFirstResponder() -> Bool { needsDisplay = true; return true }
    public override func resignFirstResponder() -> Bool { needsDisplay = true; return true }

    public override func resetCursorRects() { addCursorRect(bounds, cursor: .resizeLeftRight) }

    public override func draw(_ dirtyRect: NSRect) {
        guard window?.firstResponder === self else { return }
        focusColor.setStroke()
        let ring = NSBezierPath(roundedRect: bounds.insetBy(dx: 12, dy: 4), xRadius: 3, yRadius: 3)
        ring.lineWidth = 2
        ring.stroke()
    }

    public override func mouseDown(with event: NSEvent) {
        window?.makeFirstResponder(self)
        if event.clickCount == 2 {
            commit(CompassDevicePreferences.defaultSidebarWidth)
        } else {
            dragOrigin = (event.locationInWindow.x, doubleValue)
        }
    }

    public override func mouseDragged(with event: NSEvent) {
        guard let origin = dragOrigin else { return }
        apply(origin.width - Double(event.locationInWindow.x - origin.x))
    }

    public override func mouseUp(with event: NSEvent) {
        dragOrigin = nil
        onCommit()
    }

    public override func keyDown(with event: NSEvent) {
        if event.keyCode == 48 {
            if event.modifierFlags.contains(.shift) { window?.selectPreviousKeyView(self) }
            else { window?.selectNextKeyView(self) }
            return
        }
        guard event.modifierFlags.intersection([.command, .control, .option, .shift]).isEmpty else {
            super.keyDown(with: event)
            return
        }
        switch event.keyCode {
        case 123: commit(doubleValue + 16)
        case 124: commit(doubleValue - 16)
        case 115: commit(CompassDevicePreferences.sidebarWidthRange.lowerBound)
        case 119: commit(CompassDevicePreferences.sidebarWidthRange.upperBound)
        case 36, 76: commit(CompassDevicePreferences.defaultSidebarWidth)
        default: super.keyDown(with: event)
        }
    }

    public override func accessibilityPerformIncrement() -> Bool { commit(doubleValue + 16); return true }
    public override func accessibilityPerformDecrement() -> Bool { commit(doubleValue - 16); return true }

    private func apply(_ width: Double) {
        doubleValue = CompassDevicePreferences.clampSidebarWidth(width)
        setAccessibilityValue(doubleValue)
        onResize(doubleValue)
        needsDisplay = true
    }

    private func commit(_ width: Double) { apply(width); onCommit() }
}
