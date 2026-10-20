import CompassData
import CompassKit
import SwiftUI

struct ShortcutSidebarFooter: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var levelsStore: LevelsStore
    var isEventFormVisible: Bool = false
    var suppressTips: Bool = false
    var suppressForQuickTime: Bool = false

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

            if isEventFormVisible, !levelsStore.tipsMuted, !suppressTips, !suppressForQuickTime {
                eventFormSaveHint
            } else if !levelsStore.tipsMuted, !suppressTips, !suppressForQuickTime {
                calendarJumpHint
            }
        }
    }

    private var calendarJumpHint: some View {
        VStack(alignment: .center, spacing: 2) {
            HStack(spacing: 4) {
                Text("Hold")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textMutedColor)
                ShortcutHintChip(label: KeycapGlyphs.display(["Mod"]))
                Text("to see jump targets")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textMutedColor)
            }
            .frame(maxWidth: .infinity)
            .accessibilityIdentifier("compass-native-shortcut-tip")
            Button("Hide tips") {
                levelsStore.setTipsMuted(true)
            }
            .buttonStyle(.plain)
            .font(.rubik(11))
            .foregroundStyle(theme.textMutedColor)
        }
    }

    private var eventFormSaveHint: some View {
        VStack(alignment: .center, spacing: 2) {
            // Web `save-draft` tip: [Enter] saves · hold [Mod] to jump fields.
            HStack(spacing: 6) {
                ShortcutHintChip(label: "Enter")
                Text("saves · hold")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textMutedColor)
                ShortcutHintChip(label: KeycapGlyphs.display(["Mod"]))
                Text("to jump fields")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textMutedColor)
            }
            .frame(maxWidth: .infinity)
            Button("Hide tips") {
                levelsStore.setTipsMuted(true)
            }
            .buttonStyle(.plain)
            .font(.rubik(11))
            .foregroundStyle(theme.textMutedColor)
        }
        .accessibilityIdentifier("compass-native-shortcut-tip")
    }
}
