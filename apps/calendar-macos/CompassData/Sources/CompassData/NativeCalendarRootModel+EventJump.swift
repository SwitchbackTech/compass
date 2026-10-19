import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public var eventJumpSelection: EventJumpSelectionStore { overlayStores.eventJumpSelection }

    public var eventJumpStatusText: String? {
        if let announcement = eventJumpSelection.announcement, eventJumpSelection.isActive {
            if eventJumpSelection.activeDayKeys.isEmpty {
                return "Event jump · Esc"
            }
            return "Jump · \(announcement) · C timed · Shift+C all-day · Esc"
        }
        return nil
    }

    public func handleShiftDayJump(letter: Character) {
        guard viewStore.view == .week || viewStore.view == .day else { return }
        guard let prefix = DayJumpPrefixes.dayPrefix(forShiftedLetter: letter), prefix != "s" else { return }

        let calendar = EffectiveTimeZone.calendar
        for dayKey in visibleDateKeysForJump() {
            guard let date = CompassDateParsing.calendarDateInEffectiveTimeZone(dayKey) else { continue }
            let weekday = calendar.component(.weekday, from: date) - 1
            guard DayJumpPrefixes.prefix(forWeekday: weekday) == prefix else { continue }
            eventJumpSelection.selectDay(
                key: dayKey,
                announcement: "\(DayJumpPrefixes.displayName(forPrefix: prefix)) selected")
            recordShortcut(.focusWeekDay)
            if let first = loadedEvents.first(where: { event in
                eventJumpDayKey(for: event) == dayKey
            }) {
                focusEvent(eventId: first.id.rawValue)
            }
            applyFocusPresentation()
            return
        }
    }

    public func clearEventJumpSelection() {
        eventJumpSelection.clear()
        applyFocusPresentation()
    }

    private func eventJumpDayKey(for event: Event) -> String {
        switch event.schedule {
        case .timed(let timed):
            let start = CompassDateParsing.parseInEffectiveTimeZone(timed.start.rawValue) ?? referenceNow
            return CompassDateParsing.formatCalendarDay(start)
        case .allDay(let allDay):
            let start = CompassDateParsing.calendarDateInEffectiveTimeZone(allDay.start) ?? referenceNow
            return CompassDateParsing.formatCalendarDay(start)
        }
    }

    private func visibleDateKeysForJump() -> [String] {
        let calendar = EffectiveTimeZone.calendar
        return (0 ..< viewStore.visibleDayCount).compactMap { offset in
            guard let day = calendar.date(byAdding: .day, value: offset, to: startOfView) else {
                return nil
            }
            return CompassDateParsing.formatCalendarDay(day)
        }
    }
}
