import AppKit

/// Fixed-width inline spacer after description links for digit keycap hints (web `c-description-link-hints`).
final class DescriptionLinkHintSlotAttachment: NSTextAttachment {
    static let slotWidth: CGFloat = 22

    init() {
        super.init(data: nil, ofType: nil)
        bounds = CGRect(x: 0, y: -3, width: Self.slotWidth, height: 1)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
