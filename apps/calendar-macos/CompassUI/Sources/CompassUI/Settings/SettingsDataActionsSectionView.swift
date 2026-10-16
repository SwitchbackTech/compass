import CompassData
import SwiftUI

struct SettingsDataActionsSectionView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(model.isExportingLocalData ? "Exporting…" : "Export data") {
                Task { await model.exportLocalData() }
            }
            .disabled(model.isExportingLocalData)
            Text("Export user-created events stored on this Mac. Synced calendar caches and sample events are excluded.")
                .font(.rubik(12))
                .foregroundStyle(theme.textMutedColor)
            if model.isSignedIn {
                Button("Log out") { model.requestLogout() }
                    .disabled(model.isLoggingOut)
            }
        }
    }
}
