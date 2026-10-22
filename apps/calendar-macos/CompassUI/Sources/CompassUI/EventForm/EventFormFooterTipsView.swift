import CompassData
import CompassKit
import SwiftUI

/// Context-aware keyboard tips under the Save bar, matching web `EventFormFooterTips`.
struct EventFormFooterTipsView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    var tabNavigationApplies: Bool = true

    var body: some View {
        if !model.levelsStore.tipsMuted {
            VStack(alignment: .center, spacing: 2) {
                HStack(spacing: 4) {
                    if tabNavigationApplies {
                        ShortcutHintChip(label: "Tab")
                        Text("/")
                            .font(.rubik(11))
                            .foregroundStyle(theme.textMutedColor)
                        ShortcutHintChip(label: "Shift")
                        ShortcutHintChip(label: "Tab")
                        Text("between fields ·")
                            .font(.rubik(11))
                            .foregroundStyle(theme.textMutedColor)
                    }
                    Text("Hold")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                    ShortcutHintChip(label: KeycapGlyphs.display(["Mod"]))
                    Text("then")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                    ShortcutHintChip(label: "0")
                    Text("for actions")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                }
                .frame(maxWidth: .infinity)
                Button("Hide tips") {
                    model.levelsStore.setTipsMuted(true)
                }
                .buttonStyle(.plain)
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
            }
            .frame(minHeight: 40)
            .accessibilityIdentifier("compass-event-form-footer-tips")
        }
    }
}
