import CompassKit
import SwiftUI

struct EventJumpChipsOverlay: View {
    let hints: [EventJumpChipHint]
    let gridYOffset: CGFloat
    let visible: Bool

    var body: some View {
        if visible, !hints.isEmpty {
            GeometryReader { geometry in
                ForEach(hints) { hint in
                    // Pinned to the card's top-right corner so wider labels
                    // (SU10) grow leftward instead of past the card edge.
                    ShortcutHintChip(label: hint.label)
                        .padding(.trailing, 4)
                        .frame(width: max(hint.frame.width, 0), height: 24, alignment: .trailing)
                        .position(
                            x: hint.frame.left + hint.frame.width / 2,
                            y: (hint.isAllDay ? GridTimeConstants.dayHeaderRowHeight : gridYOffset)
                                + hint.frame.top + 12
                        )
                }
            }
            .allowsHitTesting(false)
            .accessibilityIdentifier("compass-event-jump-chips")
        }
    }
}
