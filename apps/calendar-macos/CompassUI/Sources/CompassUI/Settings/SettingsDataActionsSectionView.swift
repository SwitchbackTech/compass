import CompassData
import SwiftUI

struct SettingsDataActionsSectionView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        HStack(spacing: 12) {
            Button(model.isExportingLocalData ? "Exporting…" : "Export data") {
                Task { await model.exportLocalData() }
            }
            .buttonStyle(.bordered)
            .tint(theme.borderColor)
            .accessibilityIdentifier("settings-export-data")
            .disabled(model.isExportingLocalData)
            Button("Delete account") {
                model.requestDeleteAccount()
            }
            .buttonStyle(.borderedProminent)
            .tint(theme.errorColor)
            .accessibilityIdentifier("settings-delete-account")
            if model.isSignedIn {
                Button("Log out") { model.requestLogout() }
                    .accessibilityIdentifier("settings-log-out")
                    .disabled(model.isLoggingOut)
            }
        }
        .accessibilityIdentifier("settings-section-data-actions")
    }
}
