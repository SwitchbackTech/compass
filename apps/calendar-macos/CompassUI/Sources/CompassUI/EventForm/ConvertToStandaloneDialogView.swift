import SwiftUI

public struct ConvertToStandaloneDialogView: View {
    @Environment(\.nativeWebTheme) private var theme
    let isPresented: Bool
    let eventTitle: String
    let onCancel: () -> Void
    let onConfirm: () -> Void

    public init(
        isPresented: Bool,
        eventTitle: String,
        onCancel: @escaping () -> Void,
        onConfirm: @escaping () -> Void
    ) {
        self.isPresented = isPresented
        self.eventTitle = eventTitle
        self.onCancel = onCancel
        self.onConfirm = onConfirm
    }

    public var body: some View {
        if isPresented {
            VStack(alignment: .leading, spacing: 24) {
                ModalDialogTitle("Convert to standalone event?")
                Text("\"\(eventTitle)\" will be removed from its recurring series.")
                    .font(.rubik(16))
                    .foregroundStyle(theme.textColor)
                HStack(spacing: 12) {
                    Spacer()
                    OverlayPanelActionButton("Cancel", shortcut: ["Esc"], action: onCancel)
                        .keyboardShortcut(.cancelAction)
                    OverlayPanelActionButton("Convert", variant: .primary, shortcut: ["Enter"], action: onConfirm)
                        .keyboardShortcut(.defaultAction)
                }
            }
            .modalDialogChrome(
                maxWidth: 400,
                identifier: "compass-convert-standalone-dialog"
            )
        }
    }
}
