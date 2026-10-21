import Foundation

/// Civil-day and DST-aware minute math shared with web `@core/util/date/civil-day`.
public enum CivilDay {
    public static func civilDayLengthMinutes(for date: Date, timeZone: TimeZone) -> Int {
        let calendar = calendar(for: timeZone)
        let start = calendar.startOfDay(for: date)
        guard let nextDay = calendar.date(byAdding: .day, value: 1, to: start) else {
            return 1440
        }
        let nextMidnight = calendar.startOfDay(for: nextDay)
        return Int(nextMidnight.timeIntervalSince(start) / 60)
    }

    public static func civilHourSlotCount(for date: Date, timeZone: TimeZone) -> Int {
        civilDayLengthMinutes(for: date, timeZone: timeZone) / 60
    }

    public static func minutesFromCivilMidnight(_ date: Date, timeZone: TimeZone) -> Int {
        let calendar = calendar(for: timeZone)
        let start = calendar.startOfDay(for: date)
        return Int(floor(date.timeIntervalSince(start) / 60))
    }

    /// Matches web `gridMinutesFromCivilMidnight` for timed grid layout.
    public static func gridMinutesFromCivilMidnight(_ date: Date, timeZone: TimeZone) -> Int {
        let byElapsed = minutesFromCivilMidnight(date, timeZone: timeZone)
        let calendar = calendar(for: timeZone)
        let components = calendar.dateComponents([.hour, .minute], from: date)
        let byWallClock = (components.hour ?? 0) * 60 + (components.minute ?? 0)
        if byElapsed == byWallClock {
            return byElapsed
        }

        let slots = civilHourSlotCount(for: date, timeZone: timeZone)
        if slots == 23 {
            return byWallClock
        }
        if slots == 25 {
            let start = calendar.startOfDay(for: date)
            let daylightOffsetMinutes = timeZone.secondsFromGMT(for: start) / 60
            let instantOffsetMinutes = timeZone.secondsFromGMT(for: date) / 60
            let inRepeatedHour =
                (components.hour ?? 0) == 1 && instantOffsetMinutes < daylightOffsetMinutes
            if inRepeatedHour {
                return byElapsed
            }
            if byElapsed > byWallClock {
                return byWallClock
            }
            return byElapsed
        }

        return byElapsed
    }

    private static func calendar(for timeZone: TimeZone) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }
}
