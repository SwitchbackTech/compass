import Foundation

/// Time labels for the sidebar event form. Matches web `getTimeLabel` / `HOURS_AM_FORMAT`.
public enum EventFormTimeFormat {
    private static let valueFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    public static func formatLabel(for date: Date) -> String {
        valueFormatter.string(from: date).replacingOccurrences(of: ":00", with: "")
    }

    public static func formatValue(for date: Date) -> String {
        valueFormatter.string(from: date)
    }

    /// Fifteen-minute slots for the full day, same cadence as web `ACCEPTED_TIMES`.
    public static func quarterHourLabels() -> [String] {
        var labels: [String] = []
        labels.reserveCapacity(96)
        for hour in 0 ..< 24 {
            for minute in stride(from: 0, through: 45, by: 15) {
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = EffectiveTimeZone.timeZone
                let day = calendar.startOfDay(for: Date())
                guard let slot = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day) else {
                    continue
                }
                labels.append(formatLabel(for: slot))
            }
        }
        return labels
    }

    public static func mergeTime(into scheduleDate: Date, label: String) -> Date? {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = EffectiveTimeZone.timeZone
        parser.dateFormat = trimmed.contains(":") ? "h:mm a" : "h a"
        guard let parsed = parser.date(from: trimmed) else { return nil }
        var calendar = EffectiveTimeZone.calendar
        let time = calendar.dateComponents([.hour, .minute, .second], from: parsed)
        var day = calendar.dateComponents([.year, .month, .day], from: scheduleDate)
        day.hour = time.hour
        day.minute = time.minute
        day.second = time.second ?? 0
        return calendar.date(from: day)
    }
}
