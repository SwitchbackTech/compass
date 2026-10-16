import AppKit
import CompassData

/// Hittable mirrors of description formatting toolbar buttons for XCUITest.
@MainActor
final class DescriptionFormattingAccessibilityProbeView: NSView {
    private struct Control {
        let identifier: String
        let action: UITestDescriptionFormattingAccessibility.Action
        let button: NSButton
    }

    private var controls: [Control] = []
    private var observer: NSObjectProtocol?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = NSColor.clear.cgColor
        isHidden = true
        var x: CGFloat = 420
        for (identifier, action) in [
            ("Bold", UITestDescriptionFormattingAccessibility.Action.bold),
            ("Italic", UITestDescriptionFormattingAccessibility.Action.italic),
            ("Numbered list", UITestDescriptionFormattingAccessibility.Action.numberedList),
            ("Bullet list", UITestDescriptionFormattingAccessibility.Action.bulletList),
        ] {
            let button = NSButton(title: identifier, target: self, action: #selector(performAction(_:)))
            button.setButtonType(.pushOnPushOff)
            button.bezelStyle = .inline
            button.isBordered = false
            button.setAccessibilityIdentifier(identifier)
            button.setAccessibilityLabel(identifier)
            button.frame = NSRect(x: x, y: 360, width: 80, height: 24)
            button.tag = controls.count
            addSubview(button)
            controls.append(Control(identifier: identifier, action: action, button: button))
            x += 84
        }
        observer = NotificationCenter.default.addObserver(
            forName: UITestDescriptionFormattingAccessibility.syncNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            self?.applySync(notification)
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        if let observer {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    func update(visible: Bool) {
        isHidden = !visible
        for control in controls {
            control.button.isHidden = !visible
            control.button.isEnabled = visible
        }
        if visible {
            NSAccessibility.post(element: self, notification: .layoutChanged)
        }
    }

    @objc private func performAction(_ sender: NSButton) {
        guard sender.tag >= 0, sender.tag < controls.count else { return }
        let action = controls[sender.tag].action
        NotificationCenter.default.post(
            name: UITestDescriptionFormattingAccessibility.actionNotification,
            object: nil,
            userInfo: [UITestDescriptionFormattingAccessibility.Key.action: action.rawValue]
        )
    }

    private func applySync(_ notification: Notification) {
        guard let userInfo = notification.userInfo else { return }
        let visible = (userInfo[UITestDescriptionFormattingAccessibility.Key.visible] as? Bool) ?? false
        update(visible: visible)
        guard visible else { return }
        let states = [
            userInfo[UITestDescriptionFormattingAccessibility.Key.boldOn] as? Bool ?? false,
            userInfo[UITestDescriptionFormattingAccessibility.Key.italicOn] as? Bool ?? false,
            userInfo[UITestDescriptionFormattingAccessibility.Key.numberedListOn] as? Bool ?? false,
            userInfo[UITestDescriptionFormattingAccessibility.Key.bulletListOn] as? Bool ?? false,
        ]
        for (control, selected) in zip(controls, states) {
            control.button.state = selected ? .on : .off
            control.button.setAccessibilityValue(selected ? "1" : "0")
        }
        postLayoutChanged()
    }

    private func postLayoutChanged() {
        guard let window else { return }
        NSAccessibility.post(element: self, notification: .layoutChanged)
        NSAccessibility.post(element: window, notification: .layoutChanged)
    }
}

@MainActor
enum DescriptionFormattingAccessibilityProbe {
    private static weak var probe: DescriptionFormattingAccessibilityProbeView?

    static func attach(to window: NSWindow) {
        guard UITestLaunchPolicy.attachesAccessibilityProbes, let host = window.contentView else { return }
        attach(to: host)
    }

    static func attach(to hostView: NSView) {
        guard UITestLaunchPolicy.attachesAccessibilityProbes else { return }
        if let probe, probe.superview === hostView { return }
        probe?.removeFromSuperview()
        let view = DescriptionFormattingAccessibilityProbeView(frame: .zero)
        hostView.addSubview(view, positioned: .above, relativeTo: nil)
        probe = view
    }

    static func publish(visible: Bool) {
        guard UITestLaunchPolicy.attachesAccessibilityProbes else { return }
        if probe == nil, let window = NSApp.keyWindow ?? NSApp.mainWindow {
            attach(to: window)
        }
        probe?.update(visible: visible)
    }
}
