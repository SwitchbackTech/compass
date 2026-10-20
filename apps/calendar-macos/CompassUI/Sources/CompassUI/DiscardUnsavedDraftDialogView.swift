import SwiftUI

public struct DiscardUnsavedDraftDialogView: View {
    let isPresented: Bool
    let onCancel: () -> Void
    let onDiscard: () -> Void

    public init(
        isPresented: Bool,
        onCancel: @escaping () -> Void,
        onDiscard: @escaping () -> Void
    ) {
        self.isPresented = isPresented
        self.onCancel = onCancel
        self.onDiscard = onDiscard
    }

    public var body: some View {
        if isPresented {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 12) {
                    ModalDialogTitle("Discard unsaved changes?")
                        .frame(maxWidth: .infinity, alignment: .leading)
                    ModalDialogCloseButton(action: onCancel)
                }
                HStack(spacing: 12) {
                    Spacer()
                    OverlayPanelActionButton("Cancel", shortcut: ["Esc"], action: onCancel)
                        .keyboardShortcut(.cancelAction)
                    OverlayPanelActionButton("Discard", variant: .primary, shortcut: ["Mod", "Enter"], action: onDiscard)
                        .keyboardShortcut(.return, modifiers: .command)
                }
            }
            .modalDialogChrome(
                maxWidth: 400,
                identifier: "compass-discard-draft-dialog"
            )
        }
    }
}
