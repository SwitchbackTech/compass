import CompassData
import SwiftUI

struct EventFormToolbarView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft

    var body: some View {
        HStack(spacing: 8) {
            toolbarButton(label: "Close", systemImage: "xmark") { model.requestCloseEventForm() }
            if draft.kind == .edit {
                toolbarButton(label: "Duplicate", systemImage: "plus.square.on.square") {
                    Task { await model.duplicateFocusedOrFormEvent() }
                }
                if model.hasBookedMeetingActions {
                    BookingEventActionsView(model: model)
                } else if !model.isEventFormReadOnly(for: draft) {
                    toolbarButton(label: "Delete", systemImage: "trash") { Task { await model.deleteFormEvent() } }
                }
            }
            Spacer()
        }
        .accessibilityIdentifier("compass-event-form-actions")
    }

    private func toolbarButton(label: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.textMutedColor)
                .frame(width: 28, height: 28)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
