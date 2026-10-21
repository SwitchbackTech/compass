import AppKit

/// Per-link digit keycaps aligned to reserved inline slots after each link.
final class DescriptionLinkHintOverlayView: NSView {
    weak var textView: DescriptionTextView?
    var hintsVisible = false {
        didSet { needsLayout = true }
    }

    override var isFlipped: Bool { true }

    override func layout() {
        super.layout()
        subviews.forEach { $0.removeFromSuperview() }
        guard hintsVisible, let textView, let layoutManager = textView.layoutManager,
              let textContainer = textView.textContainer
        else { return }

        var linkIndex = 0
        let storage = textView.textStorage
        let length = storage?.length ?? 0
        guard length > 0 else { return }

        storage?.enumerateAttribute(.link, in: NSRange(location: 0, length: length)) { _, range, _ in
            guard linkIndex < 9 else { return }
            let glyphRange = layoutManager.glyphRange(
                forCharacterRange: range,
                actualCharacterRange: nil
            )
            let linkRect = layoutManager.boundingRect(forGlyphRange: glyphRange, in: textContainer)
            let slotOrigin = textView.convert(
                NSPoint(
                    x: linkRect.maxX - DescriptionLinkHintSlotAttachment.slotWidth,
                    y: linkRect.minY
                ),
                to: self
            )

            let chip = DescriptionLinkHintChipView()
            chip.label = String(linkIndex + 1)
            chip.frame = CGRect(
                x: slotOrigin.x + 2,
                y: slotOrigin.y + max(0, (linkRect.height - 18) / 2),
                width: DescriptionLinkHintSlotAttachment.slotWidth - 2,
                height: 18
            )
            chip.setAccessibilityIdentifier("compass-description-link-digit-\(linkIndex + 1)")
            addSubview(chip)
            linkIndex += 1
        }
        if hintsVisible, linkIndex > 0 {
            setAccessibilityIdentifier("compass-description-link-digit-hints")
        } else {
            setAccessibilityIdentifier("")
        }
    }
}
