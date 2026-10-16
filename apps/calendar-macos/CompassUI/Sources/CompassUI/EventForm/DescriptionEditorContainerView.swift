import AppKit
import CompassData

final class DescriptionEditorContainerView: NSView {
    let textView = DescriptionTextView()
    private let scrollView = NSScrollView()
    private let toolbar = NSStackView()
    private var buttons: [NSButton] = []
    private var formattingActionObserver: NSObjectProtocol?

    override var isFlipped: Bool { true }

    override init(frame: NSRect) {
        super.init(frame: frame)
        scrollView.drawsBackground = false
        scrollView.hasVerticalScroller = true
        scrollView.borderType = .noBorder
        scrollView.documentView = textView
        toolbar.setAccessibilityElement(true)
        toolbar.setAccessibilityRole(.toolbar)
        toolbar.setAccessibilityLabel("Description formatting")
        toolbar.orientation = .horizontal
        toolbar.spacing = 4
        for (label, symbol, action) in [
            ("Bold", "bold", #selector(DescriptionTextView.toggleBold(_:))),
            ("Italic", "italic", #selector(DescriptionTextView.toggleItalic(_:))),
            ("Numbered list", "list.number", #selector(DescriptionTextView.toggleNumberedList(_:))),
            ("Bullet list", "list.bullet", #selector(DescriptionTextView.toggleBulletList(_:))),
        ] {
            let button = NSButton(image: NSImage(systemSymbolName: symbol, accessibilityDescription: label)!,
                                  target: textView, action: action)
            button.setButtonType(.pushOnPushOff)
            button.bezelStyle = .inline
            button.isBordered = false
            button.setAccessibilityLabel(label)
            button.setAccessibilityIdentifier(label)
            button.toolTip = label
            button.widthAnchor.constraint(equalToConstant: 24).isActive = true
            button.heightAnchor.constraint(equalToConstant: 24).isActive = true
            toolbar.addArrangedSubview(button)
            buttons.append(button)
        }
        textView.onFormattingChange = { [weak self] in self?.updateControls() }
        formattingActionObserver = NotificationCenter.default.addObserver(
            forName: UITestDescriptionFormattingAccessibility.actionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let raw = notification.userInfo?[UITestDescriptionFormattingAccessibility.Key.action] as? String
            else { return }
            self?.performFormattingAction(raw)
        }
        addSubview(toolbar)
        addSubview(scrollView)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func willMove(toWindow newWindow: NSWindow?) {
        if newWindow == nil, let formattingActionObserver {
            NotificationCenter.default.removeObserver(formattingActionObserver)
            self.formattingActionObserver = nil
        }
        super.willMove(toWindow: newWindow)
    }

    override func layout() {
        super.layout()
        toolbar.frame = NSRect(x: 0, y: 0, width: 108, height: 24)
        scrollView.frame = NSRect(x: 0, y: 28, width: bounds.width, height: max(0, bounds.height - 28))
    }

    func updateControls(tint: NSColor? = nil) {
        let range = textView.selectedRange()
        let attributes = range.length > 0 && range.location < (textView.textStorage?.length ?? 0)
            ? textView.textStorage?.attributes(at: range.location, effectiveRange: nil) ?? [:]
            : textView.typingAttributes
        let font = attributes[.font] as? NSFont ?? NSFont.systemFont(ofSize: 13)
        let traits = NSFontManager.shared.traits(of: font)
        let list = attributes[HTMLFragmentAppKit.listKindKey] as? String
        let states = [traits.contains(.boldFontMask), traits.contains(.italicFontMask), list == "ordered", list == "unordered"]
        for (button, selected) in zip(buttons, states) {
            button.state = selected ? .on : .off
            button.isEnabled = textView.isEditable
            if let tint { button.contentTintColor = tint }
        }
        publishFormattingProbeSync(states: states)
    }

    private func publishFormattingProbeSync(states: [Bool]) {
        guard UITestLaunchPolicy.attachesAccessibilityProbes else { return }
        NotificationCenter.default.post(
            name: UITestDescriptionFormattingAccessibility.syncNotification,
            object: textView,
            userInfo: [
                UITestDescriptionFormattingAccessibility.Key.visible: !textView.isHidden,
                UITestDescriptionFormattingAccessibility.Key.boldOn: states[0],
                UITestDescriptionFormattingAccessibility.Key.italicOn: states[1],
                UITestDescriptionFormattingAccessibility.Key.numberedListOn: states[2],
                UITestDescriptionFormattingAccessibility.Key.bulletListOn: states[3],
            ]
        )
    }

    private func performFormattingAction(_ raw: String) {
        guard let action = UITestDescriptionFormattingAccessibility.Action(rawValue: raw) else { return }
        switch action {
        case .bold: textView.toggleBold(nil)
        case .italic: textView.toggleItalic(nil)
        case .numberedList: textView.toggleNumberedList(nil)
        case .bulletList: textView.toggleBulletList(nil)
        }
    }
}
