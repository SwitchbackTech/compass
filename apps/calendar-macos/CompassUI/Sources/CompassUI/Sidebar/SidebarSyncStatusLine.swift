import CompassData
import CompassKit
import SwiftUI

/// Web `SidebarStatusBar`'s status text: sync trouble, saving, or a stalled
/// live stream. Empty when all is well. Clicking opens Settings > Accounts.
struct SidebarSyncStatusLine: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        TimelineView(.periodic(from: .now, by: 5)) { context in
            if let status = model.sidebarSyncStatus(now: context.date) {
                Button {
                    model.settingsStore.open(page: .accounts)
                } label: {
                    Text(status.text)
                        .font(.rubik(12))
                        .foregroundStyle(status.variant == .warning ? theme.warningColor : theme.textMutedColor)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
                .help(status.text)
                .accessibilityLabel("\(status.text). Open account settings")
                .accessibilityIdentifier("compass-native-sidebar-sync-status")
            }
        }
    }
}
