import CompassKit
import SwiftUI

/// Web `QuickTimeSlots`: dashed hour placeholders while event-jump mode is on.
struct QuickTimeSlotsOverlay: View {
    @Environment(\.nativeWebTheme) private var theme
    let hints: [QuickTimeSlotHint]
    let gridYOffset: CGFloat
    let visible: Bool

    var body: some View {
        if visible, !hints.isEmpty {
            GeometryReader { _ in
                ForEach(hints) { hint in
                    RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                        .strokeBorder(
                            theme.borderStrongColor,
                            style: StrokeStyle(lineWidth: 1, dash: [4, 3])
                        )
                        .frame(width: hint.frame.width, height: hint.frame.height)
                        .overlay(alignment: .topTrailing) {
                            ShortcutHintChip(label: hint.sequence)
                                .padding(2)
                        }
                        .position(
                            x: hint.frame.left + hint.frame.width / 2,
                            y: gridYOffset + hint.frame.top + hint.frame.height / 2
                        )
                }
            }
            .allowsHitTesting(false)
            .accessibilityIdentifier("compass-quick-time-slots")
        }
    }
}
