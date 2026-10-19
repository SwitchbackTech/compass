import CompassData
import CompassKit
import SwiftUI

struct EventFormToolbarView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft

    var body: some View {
        HStack(spacing: 8) {
            toolbarButton(label: "Close", systemImage: "xmark", keycaps: ["Esc"]) {
                model.requestCloseEventForm()
            }
            if draft.kind == .edit {
                toolbarButton(label: "Duplicate", systemImage: "plus.square.on.square", keycaps: ["Mod", "D"]) {
                    Task { await model.duplicateFocusedOrFormEvent() }
                }
                if model.hasBookedMeetingActions {
                    BookingEventActionsView(model: model)
                } else if !model.isEventFormReadOnly(for: draft) {
                    toolbarButton(label: "Delete", systemImage: "trash", keycaps: ["Delete"]) {
                        Task { await model.deleteFormEvent() }
                    }
                }
            }
            Spacer()
        }
        .accessibilityIdentifier("compass-event-form-actions")
    }

    private func toolbarButton(
        label: String,
        systemImage: String,
        keycaps: [String],
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: systemImage)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.textMutedColor)
                    .frame(width: 28, height: 22)
                Text(KeycapGlyphs.display(keycaps))
                    .font(.rubik(NativeWebLayoutTokens.fontSizeXS, weight: .medium))
                    .foregroundStyle(theme.textSubtleColor)
            }
            .frame(minWidth: 36)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
