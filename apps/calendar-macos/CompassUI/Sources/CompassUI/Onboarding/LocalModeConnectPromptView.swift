import CompassData
import SwiftUI

/// Web `LocalModeConnectPrompt`: after a first write or a few shortcuts, ask a
/// never-signed-in explorer to start a trial. `S` starts it, Escape dismisses.
struct LocalModeConnectPromptView: View {
    @Environment(\.nativeWebTheme) private var theme
    var model: NativeCalendarRootModel

    var body: some View {
        FloatingNoticeCard(width: 320, isFocused: model.focusedNotice == .localModeConnectPrompt) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 8) {
                    Text("Start your free trial to save this calendar on every device.")
                        .font(.rubik(14))
                        .lineSpacing(4)
                        .foregroundStyle(theme.textColor)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    NoticeDismissButton {
                        model.onboardingStore.dismissLocalModeConnectPrompt()
                    }
                }
                Button {
                    model.startTrialFromLocalModePrompt()
                } label: {
                    HStack(spacing: 8) {
                        Text("Start free trial")
                        ShortcutHintChip(label: "S")
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                }
                .buttonStyle(CompactPrimaryButtonStyle())
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Start your free trial")
        .accessibilityIdentifier("compass-native-local-mode-connect-prompt")
        .onAppear { model.onboardingStore.trackLocalModeConnectPromptShownOnce() }
    }
}
