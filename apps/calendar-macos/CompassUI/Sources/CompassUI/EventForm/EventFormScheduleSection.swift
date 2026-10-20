import CompassData
import CompassKit
import SwiftUI

struct EventFormScheduleSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft

    private var scheduleLocked: Bool {
        model.isScheduleLocked(for: draft)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Toggle("All day", isOn: Binding(
                get: { draft.schedule.kind == .allDay },
                set: { model.setDraftAllDay($0) }
            ))
            .toggleStyle(.checkbox)
            .disabled(scheduleLocked)
            .accessibilityIdentifier("compass-event-form-allday")

            if draft.schedule.kind == .timed {
                timedRow(
                    date: draft.schedule.start,
                    dateAccessibilityIdentifier: "compass-event-form-start-date",
                    timeLabel: "Start time",
                    timeAccessibilityIdentifier: "compass-event-form-start",
                    pageJumpId: "form-start",
                    update: updateStart
                )
                timedRow(
                    date: draft.schedule.end,
                    dateAccessibilityIdentifier: "compass-event-form-end-date",
                    timeLabel: "End time",
                    timeAccessibilityIdentifier: "compass-event-form-end",
                    pageJumpId: "form-end",
                    update: updateEnd
                )
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
    }

    @ViewBuilder
    private func timedRow(
        date: Date,
        dateAccessibilityIdentifier: String,
        timeLabel: String,
        timeAccessibilityIdentifier: String,
        pageJumpId: String,
        update: @escaping (Date) -> Void
    ) -> some View {
        HStack(spacing: 8) {
            EventFormCompactDateField(
                date: Binding(
                    get: { date },
                    set: { update(mergeCalendarDay(into: date, day: $0)) }
                ),
                accessibilityIdentifier: dateAccessibilityIdentifier
            )
            .disabled(scheduleLocked)
            .pageJumpChipAnchor(id: pageJumpId)

            DatePicker(
                timeLabel,
                selection: Binding(
                    get: { date },
                    set: { update($0) }
                ),
                displayedComponents: [.hourAndMinute]
            )
            .labelsHidden()
            .controlSize(.small)
            .frame(minHeight: 38)
            .disabled(scheduleLocked)
            .accessibilityIdentifier(timeAccessibilityIdentifier)
        }
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
