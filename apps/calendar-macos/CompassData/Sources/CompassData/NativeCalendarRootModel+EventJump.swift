import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public var eventJumpSelection: EventJumpSelectionStore { overlayStores.eventJumpSelection }

    public var eventJumpStatusText: String? {
        guard eventJumpSelection.isActive else { return nil }
        if eventJumpSelection.dayJumpBuffer == "s", eventJumpSelection.activeDayKeys.isEmpty {
            return "Shift+U Sunday · Shift+A Saturday · Esc"
        }
        if let announcement = eventJumpSelection.announcement {
            if eventJumpSelection.activeDayKeys.isEmpty {
                return "Event jump · \(announcement) · Esc"
            }
            return "Jump · \(announcement) · C timed · Shift+C all-day · Esc"
        }
        return "Event jump · Esc"
    }

    public func handleShiftDayJump(letter: Character) {
        guard viewStore.view == .week || viewStore.view == .day else { return }
        let lower = String(letter).lowercased()

        if eventJumpSelection.dayJumpBuffer == "s" {
            if lower == "u" {
                selectJumpDay(prefix: "su")
                return
            }
            if lower == "a" {
                selectJumpDay(prefix: "sa")
                return
            }
        }

        if lower == "s" {
            eventJumpSelection.setWeekendDisambiguation(announcement: "Weekend")
            recordShortcut(.focusWeekDay)
            applyFocusPresentation()
            return
        }

        guard let prefix = DayJumpPrefixes.dayPrefix(forShiftedLetter: letter) else { return }
        selectJumpDay(prefix: prefix)
    }

    private func selectJumpDay(prefix: String) {
        let calendar = EffectiveTimeZone.calendar
        for dayKey in visibleDateKeys() {
            guard let date = CompassDateParsing.calendarDateInEffectiveTimeZone(dayKey) else { continue }
            let weekday = calendar.component(.weekday, from: date) - 1
            guard DayJumpPrefixes.prefix(forWeekday: weekday) == prefix else { continue }
            let name = DayJumpPrefixes.displayName(forPrefix: prefix)
            eventJumpSelection.selectDay(
                key: dayKey,
                announcement: "\(name) selected",
                buffer: prefix
            )
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

}
