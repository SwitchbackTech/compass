import Foundation

/// Wall-clock hour labels for `displayTimeZone` at each effective-zone hour line.
public enum MappedHourLabels {
    public static func labels(
        effectiveTimeZone: String,
        displayTimeZone: String,
        at referenceDate: Date
    ) -> [String] {
        var calendar = Calendar(identifier: .gregorian)
        guard
            let effectiveZone = TimeZone(identifier: effectiveTimeZone),
            let displayZone = TimeZone(identifier: displayTimeZone)
        else {
            return []
        }
        calendar.timeZone = effectiveZone
        let startOfDay = calendar.startOfDay(for: referenceDate)
        let formatter = DateFormatter()
        formatter.timeZone = displayZone
        formatter.dateFormat = "h a"

        let hours = (calendar.dateInterval(of: .day, for: referenceDate)?.duration ?? 86_400) / 3600
        return stride(from: 1.0, to: hours, by: 1.0).map { hourOffset in
            let instant = startOfDay.addingTimeInterval(hourOffset * 3600)
            var displayCalendar = calendar
            displayCalendar.timeZone = displayZone
            let minute = displayCalendar.component(.minute, from: instant)
            if minute == 0 {
                return formatter.string(from: instant)
            }
            formatter.dateFormat = "h:mm a"
            let label = formatter.string(from: instant)
            formatter.dateFormat = "h a"
            return label
        }
    }
}
