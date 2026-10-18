import CompassData
import SwiftUI

struct BookingEventActionsView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    @FocusState private var cancelFocused: Bool

    var body: some View {
        HStack(spacing: 8) {
            Button {
                Task { await model.triggerBookedMeetingCancellation() }
            } label: {
                Image(systemName: model.isCancellingBookedMeeting ? "hourglass" : "calendar.badge.minus")
                    .foregroundStyle(model.isConfirmingBookingCancellation ? theme.errorColor : theme.textMutedColor)
                    .frame(width: 28, height: 28)
            }
            .focused($cancelFocused)
            .accessibilityLabel(model.isConfirmingBookingCancellation ? "Confirm cancel" : "Cancel meeting")
            .help(model.isConfirmingBookingCancellation ? "Press again to cancel this meeting and email the guest." : "Cancel meeting")
            Button { model.rescheduleBookedMeeting() } label: {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .foregroundStyle(theme.textMutedColor)
                    .frame(width: 28, height: 28)
            }
            .accessibilityLabel("Reschedule")
        }
        .font(.system(size: 13, weight: .semibold))
        .buttonStyle(.plain)
        .disabled(model.isCancellingBookedMeeting)
        .onChange(of: model.isConfirmingBookingCancellation) { _, confirming in
            cancelFocused = confirming
        }
        .onChange(of: cancelFocused) { wasFocused, focused in
            if wasFocused && !focused { model.cancelBookedMeetingConfirmation() }
        }
        .onDisappear { model.cancelBookedMeetingConfirmation() }
    }
}
