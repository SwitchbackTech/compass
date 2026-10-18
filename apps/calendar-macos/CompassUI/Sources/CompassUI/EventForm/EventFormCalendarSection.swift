import CompassData
import CompassKit
import SwiftUI

struct EventFormCalendarSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft
    let focusField: EventFormField

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Calendar")
                .font(.rubik(12))
                .foregroundStyle(theme.textMutedColor)
            Picker(
                "Calendar",
                selection: Binding(
                    get: { draft.calendarId?.rawValue ?? "" },
                    set: { id in
                        model.updateDraftFromForm(calendarId: CalendarId(rawValue: id))
                    }
                )
            ) {
                ForEach(model.writableEventCalendars, id: \.id) { calendar in
                    Text(calendar.name).tag(calendar.id)
                }
            }
            .labelsHidden()
            .disabled(!model.canChangeDraftCalendar)
            .accessibilityIdentifier("compass-event-form-calendar")
            .pageJumpChipAnchor(id: "form-calendar")
        }
        .eventFormSectionChrome(focused: focusField == .calendar)
    }

}
