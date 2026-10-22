import Foundation

public enum GridPointerClickTarget: Equatable, Sendable {
    case timedSlot(dateKey: String, timeKey: String, timeLabel: String, startISO: String)
    case allDaySlot(dateKey: String)
}

/// Resolves empty calendar grid clicks into teaching targets (web `grid-pointer-target.ts`).
public enum GridPointerClickResolver {
    public static func dateKey(
        atX x: Double,
        columns: [GridLayoutColumnSnapshot],
        visibleDateKeys: [String]
    ) -> String? {
        for column in columns {
            let left = column.left
            let right = left + column.width
            if x >= left, x <= right {
                return column.key
            }
        }
        return visibleDateKeys.first
    }

    public static func timedSlot(
        atY y: Double,
        gridHeight: Double,
        dateKey: String,
        timeZone: TimeZone
    ) -> (timeKey: String, timeLabel: String, startISO: String)? {
        guard gridHeight > 0,
            let day = CompassDateParsing.calendarDateInEffectiveTimeZone(dateKey)
        else { return nil }

        let civilMinutes = CivilDay.civilDayLengthMinutes(for: day, timeZone: timeZone)
        let rawMinute = (y / gridHeight) * Double(civilMinutes)
        let step = Double(GridLayoutConstants.gridTimeStep)
        let minute = min(
            Double(civilMinutes) - step,
            max(0, (rawMinute / step).rounded() * step)
        )
        let hour = Int(minute) / 60
        let minutes = Int(minute) % 60
        let timeKey = String(format: "%02d%02d", hour, minutes)

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        guard let start = calendar.date(
            bySettingHour: hour,
            minute: minutes,
            second: 0,
            of: day
        ) else { return nil }

        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        formatter.timeZone = timeZone
        let timeLabel = formatter.string(from: start)
        let startISO = CompassDateParsing.formatLikeDayjs(start)
        return (timeKey, timeLabel, startISO)
    }
}
