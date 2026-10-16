import CompassData
import SwiftUI

struct LogoutConfirmationDialogView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        if model.pendingLogoutConfirmation {
            VStack(alignment: .leading, spacing: 16) {
                ModalDialogTitle("Log out?")
                Text("Your synced events will be hidden until you log back in.")
                    .font(.rubik(14))
                    .foregroundStyle(theme.textColor)
                if model.draftStore.gridDraft != nil {
                    Text("Unsaved event changes will be discarded.")
                        .font(.rubik(14))
                        .foregroundStyle(theme.textColor)
                }
                if let error = model.logoutError {
                    Text(error)
                        .font(.rubik(14))
                    .foregroundStyle(theme.textColor)
                        .accessibilityAddTraits(.updatesFrequently)
                }
                HStack {
                    Spacer()
                    Button("Cancel") { model.cancelLogout() }
                        .keyboardShortcut(.cancelAction)
                    Button(model.isLoggingOut ? "Logging out…" : "Log out") {
                        Task { await model.confirmLogout() }
                    }
                    .keyboardShortcut(.defaultAction)
                }
                .disabled(model.isLoggingOut)
            }
            .accessibilityAddTraits(.isModal)
            .modalDialogChrome(maxWidth: 400, identifier: "compass-logout-dialog")
        }
    }
}
