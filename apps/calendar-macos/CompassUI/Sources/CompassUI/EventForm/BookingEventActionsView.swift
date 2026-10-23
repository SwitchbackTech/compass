import CompassData
import SwiftUI

struct BookingEventActionsView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    @FocusState.Binding var focusedAction: String?

    var body: some View {
        HStack(spacing: 8) {
            Button {
                Task { await model.triggerBookedMeetingCancellation() }
            } label: {
                Image(systemName: model.isCancellingBookedMeeting ? "hourglass" : "calendar.badge.minus")
                    .foregroundStyle(model.isConfirmingBookingCancellation ? theme.errorColor : theme.textMutedColor)
                    .frame(width: 28, height: 28)
            }
            .focusable()
            .focused($focusedAction, equals: "Cancel meeting")
            .onKeyPress(.return) {
                Task { await model.triggerBookedMeetingCancellation() }
                return .handled
            }
            .onKeyPress(.space) {
                Task { await model.triggerBookedMeetingCancellation() }
                return .handled
            }
            .accessibilityLabel(model.isConfirmingBookingCancellation ? "Confirm cancel" : "Cancel meeting")
            .help(model.isConfirmingBookingCancellation ? "Press again to cancel this meeting and email the guest." : "Cancel meeting (⌘ ⇧ X)")
            Button { model.rescheduleBookedMeeting() } label: {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .foregroundStyle(theme.textMutedColor)
                    .frame(width: 28, height: 28)
            }
            .focusable()
            .focused($focusedAction, equals: "Reschedule")
            .onKeyPress(.return) {
                model.rescheduleBookedMeeting()
                return .handled
            }
            .onKeyPress(.space) {
                model.rescheduleBookedMeeting()
                return .handled
            }
            .accessibilityLabel("Reschedule")
            .help("Reschedule (⌘ ⇧ E)")
        }
        .font(.system(size: 13, weight: .semibold))
        .buttonStyle(.plain)
        .disabled(model.isCancellingBookedMeeting)
        .onChange(of: model.isConfirmingBookingCancellation) { _, confirming in
            if confirming { focusedAction = "Cancel meeting" }
        }
        .onChange(of: focusedAction) { previous, focused in
            if previous == "Cancel meeting" && focused != previous { model.cancelBookedMeetingConfirmation() }
        }
        .onDisappear { model.cancelBookedMeetingConfirmation() }
    }
}
