import CompassData
import CompassKit
import SwiftUI

struct EventFormScheduleSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft
    let focusField: EventFormField

    private var scheduleLocked: Bool {
        model.isScheduleLocked(for: draft)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("All day", isOn: Binding(
                get: { draft.schedule.kind == .allDay },
                set: { model.setDraftAllDay($0) }
            ))
            .toggleStyle(.checkbox)
            .disabled(scheduleLocked)
            .accessibilityIdentifier("compass-event-form-allday")

            if draft.schedule.kind == .timed {
                HStack(spacing: 8) {
                    EventFormCompactDateField(
                        date: Binding(
                            get: { draft.schedule.start },
                            set: { updateStart(mergeCalendarDay(into: draft.schedule.start, day: $0)) }
                        ),
                        accessibilityIdentifier: "compass-event-form-start-date"
                    )
                    .disabled(scheduleLocked)
                    .pageJumpChipAnchor(id: "form-start")

                    DatePicker(
                        "Start time",
                        selection: Binding(
                            get: { draft.schedule.start },
                            set: { updateStart($0) }
                        ),
                        displayedComponents: [.hourAndMinute]
                    )
                    .labelsHidden()
                    .disabled(scheduleLocked)
                    .accessibilityIdentifier("compass-event-form-start")
                }

                HStack(spacing: 8) {
                    EventFormCompactDateField(
                        date: Binding(
                            get: { draft.schedule.end },
                            set: { updateEnd(mergeCalendarDay(into: draft.schedule.end, day: $0)) }
                        ),
                        accessibilityIdentifier: "compass-event-form-end-date"
                    )
                    .disabled(scheduleLocked)
                    .pageJumpChipAnchor(id: "form-end")

                    DatePicker(
                        "End time",
                        selection: Binding(
                            get: { draft.schedule.end },
                            set: { updateEnd($0) }
                        ),
                        displayedComponents: [.hourAndMinute]
                    )
                    .labelsHidden()
                    .disabled(scheduleLocked)
                    .accessibilityIdentifier("compass-event-form-end")
                }
            } else {
                EventFormCompactDateField(
                    date: Binding(
                        get: { draft.schedule.start },
                        set: { model.updateAllDayDraftStart($0) }
                    ),
                    accessibilityIdentifier: "compass-event-form-start"
                )
                .disabled(scheduleLocked)
                .pageJumpChipAnchor(id: "form-start")

                EventFormCompactDateField(
                    date: Binding(
                        get: {
                            EffectiveTimeZone.calendar.date(byAdding: .day, value: -1, to: draft.schedule.end)
                                ?? draft.schedule.start
                        },
                        set: { model.updateAllDayDraftEnd($0) }
                    ),
                    accessibilityIdentifier: "compass-event-form-end"
                )
                .disabled(scheduleLocked)
                .pageJumpChipAnchor(id: "form-end")
            }

            if scheduleLocked {
                Text(
                    "Your calendar provider keeps this event updated (for example from an email), "
                        + "so its time follows the provider. Changes to the title, notes, and location stay in Compass."
                )
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
                .accessibilityIdentifier("compass-event-form-schedule-locked-note")
            }
        }
        .eventFormSectionChrome(focused: focusField == .start || focusField == .end)
    }

    private func mergeCalendarDay(into scheduleDate: Date, day: Date) -> Date {
        var calendar = EffectiveTimeZone.calendar
        let time = calendar.dateComponents([.hour, .minute, .second], from: scheduleDate)
        var dayComponents = calendar.dateComponents([.year, .month, .day], from: day)
        dayComponents.hour = time.hour
        dayComponents.minute = time.minute
        dayComponents.second = time.second ?? 0
        return calendar.date(from: dayComponents) ?? day
    }

    private func updateStart(_ date: Date) {
        var schedule = draft.schedule
        schedule.start = date
        if schedule.end <= date {
            schedule.end = DraftTiming.timedDraftEnd(start: date)
        }
        model.updateDraftFromForm(schedule: schedule)
    }

    private func updateEnd(_ date: Date) {
        var schedule = draft.schedule
        schedule.end = max(date, schedule.start.addingTimeInterval(60))
        model.updateDraftFromForm(schedule: schedule)
    }

}
