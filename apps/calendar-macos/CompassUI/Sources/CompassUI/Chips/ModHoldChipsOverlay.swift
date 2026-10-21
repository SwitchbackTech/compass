import CompassData
import SwiftUI

struct ModHoldChipsOverlay: View {
    let targets: [PageJumpTarget]
    let anchors: [String: Anchor<CGRect>]
    let visible: Bool
    var accessibilityIdentifier: String = "compass-mod-hold-chips"

    var body: some View {
        if visible {
            GeometryReader { geometry in
                ForEach(targets) { target in
                    if let anchor = anchors[target.id] {
                        // Web `DigitHintChipOverlay`: chip's top-right corner
                        // 2px below the anchor's, flush with its right edge.
                        let rect = geometry[anchor]
                        ShortcutHintChip(label: target.digit)
                            .padding(.top, 2)
                            .frame(width: rect.width, height: rect.height, alignment: .topTrailing)
                            .position(x: rect.midX, y: rect.midY)
                    }
                }
            }
            .allowsHitTesting(false)
            .accessibilityIdentifier(accessibilityIdentifier)
        }
    }
}
