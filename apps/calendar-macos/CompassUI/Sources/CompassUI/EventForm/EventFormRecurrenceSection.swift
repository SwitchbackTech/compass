import CompassData
import CompassKit
import SwiftUI

struct EventFormRecurrenceSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft
    let focusField: EventFormField

    @State private var pattern: RecurrenceRuleLine.Pattern = .init()
    @State private var hasRecurrence: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("Repeat", isOn: Binding(
                get: { hasRecurrence },
                set: { toggleRecurrence($0) }
            ))
            .toggleStyle(.switch)
            .accessibilityIdentifier("compass-event-form-recurrence-toggle")

            if hasRecurrence {
                Picker("Frequency", selection: $pattern.frequency) {
                    Text("Daily").tag(RecurrenceRuleLine.Frequency.daily)
                    Text("Weekly").tag(RecurrenceRuleLine.Frequency.weekly)
                    Text("Monthly").tag(RecurrenceRuleLine.Frequency.monthly)
                    Text("Yearly").tag(RecurrenceRuleLine.Frequency.yearly)
                }
                .pickerStyle(.menu)
                .accessibilityIdentifier("compass-event-form-recurrence-frequency")
                .onChange(of: pattern.frequency) { _, _ in syncDraftRecurrence() }

                Stepper(
                    "Every \(pattern.interval)",
                    value: Binding(
                        get: { pattern.interval },
                        set: {
                            pattern.interval = max(1, min(12, $0))
                            syncDraftRecurrence()
                        }
                    ),
                    in: 1 ... 12
                )
                .accessibilityIdentifier("compass-event-form-recurrence-interval")

                if pattern.frequency == .weekly {
                    weekdayRow
                }

                Toggle("End date", isOn: Binding(
                    get: { pattern.until != nil },
                    set: { enabled in
                        pattern.until = enabled ? inclusiveEndDate(defaultUntil) : nil
                        if enabled { pattern.count = nil }
                        syncDraftRecurrence()
                    }
                ))
                .toggleStyle(.checkbox)
                .accessibilityIdentifier("compass-event-form-recurrence-has-until")

                if pattern.until != nil {
                    DatePicker(
                        "Ends on",
                        selection: Binding(
                            get: { pattern.until ?? defaultUntil },
                            set: {
                                pattern.until = inclusiveEndDate($0)
                                pattern.count = nil
                                syncDraftRecurrence()
                            }
                        ),
                        in: EffectiveTimeZone.calendar.startOfDay(for: draft.schedule.start)...,
                        displayedComponents: [.date]
                    )
                    .accessibilityIdentifier("compass-event-form-recurrence-until")
                }

                if !summaryText.isEmpty {
                    Text(summaryText)
                        .font(.rubik(12))
                        .foregroundStyle(theme.textMutedColor)
                        .accessibilityIdentifier("compass-event-form-recurrence-summary")
                }
            }
        }
        .eventFormSectionChrome(focused: focusField == .recurrence)
        .onAppear { reloadFromDraft() }
        .onChange(of: draft.recurrence) { _, _ in reloadFromDraft() }
        .onChange(of: draft.schedule.start) { _, _ in syncDraftRecurrence() }
    }

    private var weekdayRow: some View {
        HStack(spacing: 4) {
            ForEach(weekdayLabels, id: \.index) { entry in
                let selected = pattern.byWeekday.contains(entry.index)
                Button(entry.label) {
                    if selected {
                        pattern.byWeekday.removeAll { $0 == entry.index }
                    } else {
                        pattern.byWeekday.append(entry.index)
                    }
                    syncDraftRecurrence()
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(selected ? theme.accentColor.opacity(0.2) : theme.surfaceColor.opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .foregroundStyle(theme.textColor)
            }
        }
        .accessibilityIdentifier("compass-event-form-recurrence-weekdays")
    }

    private var weekdayLabels: [(index: Int, label: String)] {
        [
            (0, "M"), (1, "T"), (2, "W"), (3, "T"), (4, "F"), (5, "S"), (6, "S"),
        ]
    }

    private var defaultUntil: Date {
        EffectiveTimeZone.calendar.date(byAdding: .month, value: 3, to: draft.schedule.start)
            ?? draft.schedule.start
    }

    private var summaryText: String {
        let rules = currentRules
        guard !rules.isEmpty else { return "" }
        let startISO = scheduleStartISO
        let endISO = scheduleEndISO
        return RecurrenceRuleLine.summary(
            rules: rules,
            scheduleStartISO: startISO,
            scheduleEndISO: endISO,
            timeZoneIdentifier: EffectiveTimeZone.identifier
        )
    }

    private var scheduleStartISO: String {
        switch draft.schedule.kind {
        case .timed:
            return CompassDateParsing.formatLikeDayjs(draft.schedule.start)
        case .allDay:
            return CompassDateParsing.formatCalendarDay(draft.schedule.start)
        }
    }

    private var scheduleEndISO: String {
        switch draft.schedule.kind {
        case .timed:
            return CompassDateParsing.formatLikeDayjs(draft.schedule.end)
        case .allDay:
            return CompassDateParsing.formatCalendarDay(draft.schedule.end)
        }
    }

    private var currentRules: [String] {
        GridEventDraftRecurrence.resolvedRules(
            draft: draft,
            baselineEvent: model.baselineEvent(for: draft),
            seriesMaster: model.baselineEvent(for: draft).flatMap { model.seriesMaster(for: $0) }
        )
    }

    private func reloadFromDraft() {
        let rules = currentRules
        hasRecurrence = !rules.isEmpty || draft.recurrence == .series(rules: [])
        if let parsed = RecurrenceRuleLine.parsePattern(from: rules,
            timeZoneIdentifier: EffectiveTimeZone.identifier, isAllDay: draft.schedule.kind == .allDay) {
            pattern = parsed
        } else if hasRecurrence {
            pattern = .init(
                frequency: .weekly,
                interval: 1,
                byWeekday: [weekdayIndex(for: draft.schedule.start)]
            )
        }
    }

    private func toggleRecurrence(_ enabled: Bool) {
        hasRecurrence = enabled
        if enabled {
            if pattern.byWeekday.isEmpty, pattern.frequency == .weekly {
                pattern.byWeekday = [weekdayIndex(for: draft.schedule.start)]
            }
            syncDraftRecurrence()
        } else {
            model.updateDraftRecurrence(.single)
        }
    }

    private func syncDraftRecurrence() {
        guard hasRecurrence else { return }
        let isAllDay = draft.schedule.kind == .allDay
        guard
            let line = RecurrenceRuleLine.buildLine(
                pattern: pattern,
                scheduleStart: draft.schedule.start,
                scheduleEnd: draft.schedule.end,
                timeZoneIdentifier: EffectiveTimeZone.identifier,
                isAllDay: isAllDay
            )
        else { return }
        model.updateDraftRecurrence(.series(rules: [line]))
    }

    private func inclusiveEndDate(_ date: Date) -> Date {
        RecurrenceRuleLine.inclusiveEndDate(date, timeZoneIdentifier: EffectiveTimeZone.identifier)
    }

    private func weekdayIndex(for date: Date) -> Int {
        var calendar = EffectiveTimeZone.calendar
        calendar.firstWeekday = 1
        let weekday = calendar.component(.weekday, from: date)
        return (weekday + 5) % 7
    }
}
