import CompassData
import CompassKit
import SwiftUI

struct EventFormConferenceSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft

    var body: some View {
        if let url = model.meetingLinkURL(for: draft) {
            EventFormMeetingLinkRow(
                model: model,
                url: url,
                label: EventFormMeetingLink.label(baseline: model.baselineEvent(for: draft))
            )
        } else if model.showCreateConferenceToggle(for: draft),
            let kind = CalendarCapabilities.creatableConferenceKind(on: model.attendeeCalendar(for: draft))
        {
            EventFormIconRow(icon: .videoCamera) {
                Toggle(
                    isOn: Binding(
                        get: { draft.createConference },
                        set: { model.setDraftCreateConference($0) }
                    )
                ) {
                    Text("Add \(CalendarCapabilities.conferenceKindLabel(kind))")
                        .font(.rubik(13))
                        .foregroundStyle(theme.textMutedColor)
                }
                .toggleStyle(.switch)
                .accessibilityIdentifier("compass-event-form-conference")
                .pageJumpChipAnchor(id: "form-conference")
            }
        }
    }
}
