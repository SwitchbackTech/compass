import CompassKit
import SwiftUI

public struct DemoEventsBannerView: View {
    @Environment(\.nativeWebTheme) private var theme
    let onDismiss: () -> Void

    public init(onDismiss: @escaping () -> Void) {
        self.onDismiss = onDismiss
    }

    public var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Text("Sample events to help you explore. Clear them from the command palette")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textMutedColor)
                ShortcutHintChip(label: KeycapGlyphs.display(["Mod"]))
                ShortcutHintChip(label: "K")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 8) {
                Text("Okay")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textColor)
                    .foregroundStyle(theme.textColor)
                ShortcutHintChip(label: "O")
            }
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel("Okay")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(theme.surfacePanelColor)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(theme.borderColor)
                .frame(height: 1)
        }
        .accessibilityIdentifier("compass-native-demo-events-banner")
        .onTapGesture(perform: onDismiss)
    }
}
