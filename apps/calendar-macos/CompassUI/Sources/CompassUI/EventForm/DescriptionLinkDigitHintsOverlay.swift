import SwiftUI

struct DescriptionLinkDigitHintsOverlay: View {
    let linkCount: Int
    let visible: Bool

    var body: some View {
        if visible, linkCount > 0 {
            VStack(alignment: .trailing, spacing: 2) {
                ForEach(0..<min(linkCount, 9), id: \.self) { index in
                    ShortcutHintChip(label: String(index + 1))
                }
            }
            .padding(.trailing, 2)
            .padding(.top, 32)
            .allowsHitTesting(false)
            .accessibilityIdentifier("compass-description-link-digit-hints")
        }
    }
}
