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
            Menu {
                ForEach(model.writableEventCalendars, id: \.id) { calendar in
                    Button(calendarLabel(calendar)) {
                        model.updateDraftFromForm(calendarId: CalendarId(rawValue: calendar.id))
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if let calendar = selectedCalendar {
                        Circle()
                            .fill(calendarDotColor(calendar))
                            .frame(width: 10, height: 10)
                    }
                    Text(selectedCalendar.map(calendarLabel) ?? "Choose calendar")
                        .font(.rubik(NativeWebLayoutTokens.fontSizeBody))
                        .foregroundStyle(theme.textColor)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(theme.textMutedColor)
                }
                .padding(.horizontal, 8)
                .frame(minHeight: 38)
                .background(theme.surfaceOverlayColor)
                .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
                .overlay {
                    RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                        .stroke(focusField == .calendar ? theme.accentColor : theme.borderColor, lineWidth: 1)
                }
            }
            .disabled(!model.canChangeDraftCalendar)
            .accessibilityIdentifier("compass-event-form-calendar")
            .pageJumpChipAnchor(id: "form-calendar")
        }
        .eventFormSectionChrome(focused: focusField == .calendar)
    }

    private var selectedCalendar: CompassCalendar? {
        guard let id = draft.calendarId else { return nil }
        return model.writableEventCalendars.first { $0.id == id.rawValue }
    }

    private func calendarLabel(_ calendar: CompassCalendar) -> String {
        calendar.isPrimary ? "\(calendar.name) (primary)" : calendar.name
    }

    private func calendarDotColor(_ calendar: CompassCalendar) -> Color {
        EventCardColorParser.nsColor(hex: calendar.backgroundColor).map(Color.init(nsColor:))
            ?? theme.textMutedColor
    }
}
