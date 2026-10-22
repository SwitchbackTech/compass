import AppKit
import SwiftUI

/// Web `OverlayPanel` backdrop: `bg-background/85` over a light blur
/// (`backdrop-blur-sm`), so the calendar shows faintly through. The dark
/// `overlayBackdrop` dim belongs to menus and confirm dialogs, not panels.
struct PanelBackdropView: NSViewRepresentable {
    @Environment(\.nativeWebTheme) private var theme

    func makeNSView(context: Context) -> NSView {
        let container = NSView()
        container.wantsLayer = true

        let blur = NSVisualEffectView()
        blur.material = .windowBackground
        blur.blendingMode = .withinWindow
        blur.state = .active
        blur.translatesAutoresizingMaskIntoConstraints = false

        let tint = NSView()
        tint.wantsLayer = true
        tint.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(blur)
        container.addSubview(tint)
        NSLayoutConstraint.activate([
            blur.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            blur.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            blur.topAnchor.constraint(equalTo: container.topAnchor),
            blur.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            tint.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            tint.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            tint.topAnchor.constraint(equalTo: container.topAnchor),
            tint.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
        context.coordinator.blurView = blur
        context.coordinator.tintView = tint
        return container
    }

    func updateNSView(_ container: NSView, context: Context) {
        context.coordinator.tintView?.layer?.backgroundColor = NSColor(theme.panelBackdropColor).cgColor
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator {
        var blurView: NSVisualEffectView?
        var tintView: NSView?
    }
}
