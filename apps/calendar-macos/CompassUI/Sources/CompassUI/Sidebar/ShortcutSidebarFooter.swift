import CompassData
import SwiftUI

struct ShortcutSidebarFooter: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var levelsStore: LevelsStore

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let toast = levelsStore.pendingLevelUpToast {
                Text(toast.title)
                    .font(.rubik(12))
                    .foregroundStyle(theme.textColor)
                    .padding(8)
                    .background(theme.surfaceColor)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                            levelsStore.consumeLevelUpToast()
                        }
                    }
            }

            if !levelsStore.badgeHidden, let tip = levelsStore.currentTip {
                HStack(spacing: 8) {
                    Text("Try \(tip.label)")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                        .lineLimit(2)
                        .accessibilityIdentifier("compass-native-shortcut-tip")
                    HStack(spacing: 3) {
                        ForEach(Array(tip.keycaps.enumerated()), id: \.offset) { _, key in
                            ShortcutHintChip(label: key)
                        }
                    }
                }
            }
        }
    }
}
