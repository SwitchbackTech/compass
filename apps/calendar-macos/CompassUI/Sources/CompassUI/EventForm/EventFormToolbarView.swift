import CompassData
import CompassKit
import SwiftUI

struct EventFormToolbarView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft

    var body: some View {
        HStack(spacing: 4) {
            Spacer(minLength: 0)
            if draft.kind == .edit {
                toolbarButton(label: "Duplicate", icon: .copy) {
                    Task { await model.duplicateFocusedOrFormEvent() }
                }
                if model.hasBookedMeetingActions {
                    BookingEventActionsView(model: model)
                } else if !model.isEventFormReadOnly(for: draft) {
                    toolbarButton(label: "Delete", icon: .trash) {
                        Task { await model.deleteFormEvent() }
                    }
                }
            } else if !model.isEventFormReadOnly(for: draft) {
                // Web shows Delete on a new draft too; nothing is saved, so it
                // closes the form (with the discard prompt if it was edited).
                toolbarButton(label: "Delete", icon: .trash) {
                    model.requestCloseEventForm()
                }
            }
            toolbarButton(label: "Close", icon: .x) {
                model.requestCloseEventForm()
            }
        }
        .accessibilityIdentifier("compass-event-form-actions")
    }

    private func toolbarButton(
        label: String,
        icon: PhosphorIcon,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            PhosphorIconView(icon: icon, size: 18)
                .frame(width: 32, height: 32)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
