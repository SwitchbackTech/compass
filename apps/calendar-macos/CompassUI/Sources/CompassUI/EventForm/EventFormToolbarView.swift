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
                toolbarButton(label: "Duplicate", systemImage: "square.on.square") {
                    Task { await model.duplicateFocusedOrFormEvent() }
                }
                if model.hasBookedMeetingActions {
                    BookingEventActionsView(model: model)
                } else if !model.isEventFormReadOnly(for: draft) {
                    toolbarButton(label: "Delete", systemImage: "trash") {
                        Task { await model.deleteFormEvent() }
                    }
                }
            }
            toolbarButton(label: "Close", systemImage: "xmark") {
                model.requestCloseEventForm()
            }
        }
        .accessibilityIdentifier("compass-event-form-actions")
    }

    private func toolbarButton(
        label: String,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 18, weight: .regular))
                .foregroundStyle(theme.textMutedColor)
                .frame(width: 32, height: 32)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
