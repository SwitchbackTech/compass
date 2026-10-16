import AppKit
import CompassKit
import SwiftUI

struct DescriptionEditorView: NSViewRepresentable {
    @Environment(\.nativeWebTheme) private var theme
    @Binding var html: String
    var resetKey: String
    var isFocused: Bool
    var isEditable = true

    func makeCoordinator() -> Coordinator {
        Coordinator(html: $html)
    }

    func makeNSView(context: Context) -> DescriptionEditorContainerView {
        let container = DescriptionEditorContainerView()
        let textView = container.textView
        textView.isRichText = true
        textView.importsGraphics = false
        textView.isEditable = isEditable
        textView.allowsUndo = true
        textView.isSelectable = true
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 4, height: 6)
        textView.autoresizingMask = [.width]
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.textContainer?.widthTracksTextView = true
        textView.delegate = context.coordinator
        textView.setAccessibilityIdentifier("compass-event-form-description")
        textView.setAccessibilityLabel("Description")

        context.coordinator.container = container
        context.coordinator.textView = textView
        context.coordinator.applyTheme(theme)
        context.coordinator.load(html: html, resetKey: resetKey)
        return container
    }

    func updateNSView(_ container: DescriptionEditorContainerView, context: Context) {
        let textView = container.textView
        textView.isEditable = isEditable
        context.coordinator.applyTheme(theme)
        if context.coordinator.resetKey != resetKey {
            context.coordinator.load(html: html, resetKey: resetKey)
        }
        if isFocused, isEditable, textView.window != nil {
            textView.window?.makeFirstResponder(textView)
        }
    }

    @MainActor
    final class Coordinator: NSObject, NSTextViewDelegate {
        private var html: Binding<String>
        weak var textView: DescriptionTextView?
        weak var container: DescriptionEditorContainerView?
        var resetKey: String = ""
        private var suppressDelegate = false

        init(html: Binding<String>) {
            self.html = html
        }

        func applyTheme(_ theme: NativeWebTheme) {
            guard let textView else { return }
            var attributes = textView.typingAttributes
            if attributes[.font] == nil { attributes[.font] = NSFont.systemFont(ofSize: 13) }
            attributes[.foregroundColor] = NSColor(theme.textColor)
            textView.typingAttributes = attributes
            textView.textColor = NSColor(theme.textColor)
            textView.insertionPointColor = NSColor(theme.textColor)
            container?.updateControls(tint: NSColor(theme.textMutedColor))
            textView.linkTextAttributes = [
                .foregroundColor: NSColor(theme.accentColor),
                .underlineStyle: NSUnderlineStyle.single.rawValue,
            ]
        }

        func load(html: String, resetKey: String) {
            guard let textView else { return }
            self.resetKey = resetKey
            let sourceDocument = HTMLFragmentDocument.parse(html)
            let attributed = HTMLFragmentAppKit.attributedString(
                from: sourceDocument,
                textColor: textView.textColor ?? .labelColor,
                linkColor: (textView.linkTextAttributes?[.foregroundColor] as? NSColor) ?? .linkColor
            )
            suppressDelegate = true
            textView.textStorage?.setAttributedString(attributed)
            suppressDelegate = false
        }

        func textDidChange(_ notification: Notification) {
            guard !suppressDelegate, let textView else { return }
            let edited = HTMLFragmentAppKit.document(from: textView.attributedString())
            html.wrappedValue = edited.serialize()
            container?.updateControls()
        }

        func textViewDidChangeSelection(_ notification: Notification) {
            container?.updateControls()
        }
    }
}

final class DescriptionTextView: NSTextView {
    var onFormattingChange: (() -> Void)?

    @objc func toggleBold(_ sender: Any?) { toggleFontTrait(.boldFontMask) }
    @objc func toggleItalic(_ sender: Any?) { toggleFontTrait(.italicFontMask) }
    @objc func toggleNumberedList(_ sender: Any?) { toggleList(ordered: true) }
    @objc func toggleBulletList(_ sender: Any?) { toggleList(ordered: false) }

    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        if event.modifierFlags.contains(.command) {
            switch event.charactersIgnoringModifiers?.lowercased() {
            case "b":
                toggleFontTrait(.boldFontMask)
                return true
            case "i":
                toggleFontTrait(.italicFontMask)
                return true
            case "k":
                promptAndApplyLink()
                return true
            default:
                break
            }
        }
        return super.performKeyEquivalent(with: event)
    }

    override func mouseDown(with event: NSEvent) {
        if event.modifierFlags.contains(.command),
            let link = link(at: event.locationInWindow)
        {
            NSWorkspace.shared.open(link)
            return
        }
        super.mouseDown(with: event)
    }

    private func link(at locationInWindow: NSPoint) -> URL? {
        guard let layoutManager, let textContainer else { return nil }
        let point = convert(locationInWindow, from: nil)
        let index = layoutManager.characterIndex(
            for: point,
            in: textContainer,
            fractionOfDistanceBetweenInsertionPoints: nil
        )
        guard index < (string as NSString).length else { return nil }
        return attributedString().attribute(.link, at: index, effectiveRange: nil) as? URL
    }

    func toggleFontTrait(_ trait: NSFontTraitMask) {
        guard isEditable else { return }
        window?.makeFirstResponder(self)
        let range = selectedRange()
        if range.length == 0 {
            let font = typingAttributes[.font] as? NSFont ?? NSFont.systemFont(ofSize: 13)
            let hasTrait = NSFontManager.shared.traits(of: font).contains(trait)
            typingAttributes[.font] = hasTrait
                ? NSFontManager.shared.convert(font, toNotHaveTrait: trait)
                : NSFontManager.shared.convert(font, toHaveTrait: trait)
            onFormattingChange?()
            return
        }
        guard shouldChangeText(in: range, replacementString: nil) else { return }
        textStorage?.enumerateAttribute(.font, in: range) { value, subRange, _ in
            let font = (value as? NSFont) ?? NSFont.systemFont(ofSize: 13)
            let hasTrait = NSFontManager.shared.traits(of: font).contains(trait)
            let updated = hasTrait
                ? NSFontManager.shared.convert(font, toNotHaveTrait: trait)
                : NSFontManager.shared.convert(font, toHaveTrait: trait)
            textStorage?.addAttribute(.font, value: updated, range: subRange)
        }
        didChangeText()
        onFormattingChange?()
    }

    func toggleList(ordered: Bool) {
        guard isEditable, let storage = textStorage else { return }
        let text = string as NSString
        let selection = selectedRange()
        let before = text.range(of: "\n", options: .backwards, range: NSRange(location: 0, length: selection.location))
        let start = before.location == NSNotFound ? 0 : NSMaxRange(before)
        let lastSelected = max(selection.location, NSMaxRange(selection) - 1)
        let after = text.range(of: "\n", range: NSRange(location: lastSelected, length: text.length - lastSelected))
        let end = after.location == NSNotFound ? text.length : after.location
        let range = NSRange(location: start, length: end - start)
        guard shouldChangeText(in: range, replacementString: nil) else { return }
        let source = storage.attributedSubstring(from: range)
        let kind = ordered ? "ordered" : "unordered"
        let lines = source.string.components(separatedBy: "\n")
        var offset = 0
        let items = lines.map { line -> (NSMutableAttributedString, String?, Int) in
            let length = (line as NSString).length
            let currentKind = length > 0 ? source.attribute(HTMLFragmentAppKit.listKindKey, at: offset, effectiveRange: nil) as? String : nil
            let prefix = HTMLFragmentAppKit.listPrefixLength(line, kind: currentKind)
            let content = NSMutableAttributedString(attributedString: source.attributedSubstring(
                from: NSRange(location: offset + prefix, length: length - prefix)))
            content.removeAttribute(HTMLFragmentAppKit.listKindKey, range: NSRange(location: 0, length: content.length))
            offset += length + 1
            return (content, currentKind, prefix)
        }
        let remove = items.allSatisfy { $0.1 == kind }
        let replacement = NSMutableAttributedString()
        var firstPrefixLength = 0
        for (index, item) in items.enumerated() {
            if index > 0 { replacement.append(NSAttributedString(string: "\n")) }
            let itemStart = replacement.length
            if !remove {
                let prefix = ordered ? "\(index + 1). " : "• "
                if index == 0 { firstPrefixLength = (prefix as NSString).length }
                replacement.append(NSAttributedString(string: prefix, attributes: typingAttributes))
            }
            replacement.append(item.0)
            if !remove {
                replacement.addAttribute(HTMLFragmentAppKit.listKindKey, value: kind,
                    range: NSRange(location: itemStart, length: replacement.length - itemStart))
            }
        }
        storage.replaceCharacters(in: range, with: replacement)
        let newLocation = min(start + replacement.length, max(start, selection.location + firstPrefixLength - (items.first?.2 ?? 0)))
        let newEnd = min(start + replacement.length, max(newLocation, NSMaxRange(selection) + replacement.length - range.length))
        setSelectedRange(NSRange(location: newLocation, length: selection.length == 0 ? 0 : newEnd - newLocation))
        if remove { typingAttributes.removeValue(forKey: HTMLFragmentAppKit.listKindKey) }
        else { typingAttributes[HTMLFragmentAppKit.listKindKey] = kind }
        didChangeText()
        onFormattingChange?()
        window?.makeFirstResponder(self)
    }

    private func promptAndApplyLink() {
        let selected = selectedRange()
        guard isEditable, selected.length > 0 else { return }
        let alert = NSAlert()
        alert.messageText = "Add Link"
        alert.informativeText = "Enter a URL for the selected text."
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.placeholderString = "https://"
        alert.accessoryView = field
        alert.addButton(withTitle: "Apply")
        alert.addButton(withTitle: "Cancel")
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        let href = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard href.hasPrefix("http://") || href.hasPrefix("https://"), let url = URL(string: href) else {
            return
        }
        applyLink(url, to: selected)
    }

    func applyLink(_ url: URL, to range: NSRange) {
        guard isEditable, range.length > 0,
              shouldChangeText(in: range, replacementString: nil) else { return }
        textStorage?.addAttribute(.link, value: url, range: range)
        didChangeText()
        onFormattingChange?()
    }
}
