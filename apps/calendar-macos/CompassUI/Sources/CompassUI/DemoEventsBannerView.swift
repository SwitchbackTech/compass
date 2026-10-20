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
                    .font(.rubik(12))
                    .foregroundStyle(theme.textMutedColor)
                ShortcutHintChip(label: "⌘")
                ShortcutHintChip(label: "K")
            }
            Spacer(minLength: 8)
            HStack(spacing: 6) {
                Text("Okay")
                    .font(.rubik(12))
                    .foregroundStyle(theme.textColor)
                ShortcutHintChip(label: "O")
            }
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel("Okay")
        }
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
