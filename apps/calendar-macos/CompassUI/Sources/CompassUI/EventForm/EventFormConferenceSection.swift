import CompassData
import CompassKit
import SwiftUI

struct EventFormConferenceSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft

    var body: some View {
        if model.showCreateConferenceToggle(for: draft),
            let kind = CalendarCapabilities.creatableConferenceKind(on: model.attendeeCalendar(for: draft))
        {
            EventFormIconRow(systemImage: "video") {
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
