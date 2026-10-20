import CompassData
import CompassKit
import SwiftUI

struct DeleteAccountConfirmationDialogView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    @State private var typedPhrase = ""

    private static let confirmPhrase = "Delete my Compass account"

    var body: some View {
        if model.pendingDeleteAccountConfirmation {
            VStack(alignment: .leading, spacing: 24) {
                ModalDialogTitle("Delete your Compass account?")
                Text(
                    "This deletes your Compass account and data: your calendars, events, and settings. "
                        + "It can't be undone.\n\n"
                        + "If you have a Compass trial or subscription, it is canceled immediately and your "
                        + "saved payment details are removed. Previous payments aren't refunded automatically.\n\n"
                        + "Your connected calendars are not affected. Nothing there gets deleted, Compass just "
                        + "loses its access to them."
                )
                .font(.rubik(16))
                .foregroundStyle(theme.textColor)
                VStack(alignment: .leading, spacing: 8) {
                    (Text("Type ").foregroundColor(theme.textColor)
                        + Text(Self.confirmPhrase).foregroundColor(theme.textMutedColor)
                        + Text(" to confirm").foregroundColor(theme.textColor))
                        .font(.rubik(14))
                    TextField("Confirmation phrase", text: $typedPhrase)
                        .textFieldStyle(.plain)
                        .font(.rubik(14))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(theme.surfaceOverlayColor)
                        .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
                        .overlay {
                            RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                                .stroke(theme.borderColor, lineWidth: 1)
                        }
                        .accessibilityIdentifier("compass-delete-account-phrase")
                }
                if let error = model.deleteAccountError {
                    Text(error)
                        .font(.rubik(14))
                        .foregroundStyle(theme.textColor)
                }
                HStack(spacing: 12) {
                    OverlayPanelActionButton(
                        model.isDeletingAccount ? "Deleting…" : "Delete account",
                        variant: .destructive,
                        shortcut: typedPhrase == Self.confirmPhrase ? ["Enter"] : []
                    ) {
                        Task { await model.confirmDeleteAccount() }
                    }
                    .keyboardShortcut(.defaultAction)
                    .disabled(typedPhrase != Self.confirmPhrase || model.isDeletingAccount)
                    OverlayPanelActionButton("Cancel", shortcut: ["Esc"]) { model.cancelDeleteAccount() }
                        .keyboardShortcut(.cancelAction)
                    Spacer()
                }
            }
            .accessibilityAddTraits(.isModal)
            .modalDialogChrome(maxWidth: 480, identifier: "compass-delete-account-dialog")
        }
    }
}
