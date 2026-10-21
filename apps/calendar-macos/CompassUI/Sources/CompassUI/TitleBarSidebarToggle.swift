import AppKit
import CompassData
import SwiftUI

/// AppKit sidebar toggle so real window/screencapture PNGs include the control.
/// SwiftUI `Button` + Phosphor reported accessibility frames in CI while painting nothing
/// in the XCUITest window bitmap at the same coordinates.
struct TitleBarSidebarToggle: NSViewRepresentable {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeNSView(context: Context) -> NSButton {
        let button = NSButton(frame: NSRect(x: 0, y: 0, width: 24, height: 24))
        button.bezelStyle = .shadowlessSquare
        button.isBordered = false
        button.imagePosition = .imageOnly
        button.target = context.coordinator
        button.action = #selector(Coordinator.toggleSidebar)
        button.setAccessibilityIdentifier("compass-native-sidebar-toggle")
        context.coordinator.applyAppearance(to: button, theme: theme, isOpen: model.isSidebarOpen)
        return button
    }

    func updateNSView(_ nsView: NSButton, context: Context) {
        context.coordinator.model = model
        context.coordinator.applyAppearance(to: nsView, theme: theme, isOpen: model.isSidebarOpen)
    }

    @MainActor
    final class Coordinator: NSObject {
        var model: NativeCalendarRootModel

        init(model: NativeCalendarRootModel) {
            self.model = model
        }

        @objc func toggleSidebar() {
            model.isSidebarOpen.toggle()
        }

        func applyAppearance(to button: NSButton, theme: NativeWebTheme, isOpen: Bool) {
            let label = isOpen ? "Close sidebar" : "Open sidebar"
            button.toolTip = label
            button.setAccessibilityLabel(label)
            let icon = PhosphorIconView(
                icon: .sidebarSimple,
                size: 21,
                color: theme.textMutedColor,
                mirrored: true
            )
            .frame(width: 21, height: 21)
            let renderer = ImageRenderer(content: icon)
            renderer.scale = 2
            button.image = renderer.nsImage
            button.contentTintColor = NSColor(theme.textMutedColor)
        }
    }
}
