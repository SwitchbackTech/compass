import Foundation

/// Parse and build RRULE lines for native recurrence editing (web RecurrenceSection parity).
public enum RecurrenceRuleLine {
    public enum Frequency: String, Sendable, CaseIterable {
        case daily = "DAILY"
        case weekly = "WEEKLY"
        case monthly = "MONTHLY"
        case yearly = "YEARLY"
    }

    public struct Pattern: Sendable, Equatable {
        public var frequency: Frequency
        public var interval: Int
        public var byWeekday: [Int]
        public var until: Date?
        public var count: Int?

        public init(
            frequency: Frequency = .weekly,
            interval: Int = 1,
            byWeekday: [Int] = [],
            until: Date? = nil,
            count: Int? = nil
        ) {
            self.frequency = frequency
            self.interval = max(1, interval)
            self.byWeekday = byWeekday
            self.until = until
            self.count = count
        }
    }

    public static func firstRule(from rules: [String]) -> String? {
        rules.first { $0.uppercased().hasPrefix("RRULE:") }
    }

    public static func parsePattern(from rules: [String], timeZoneIdentifier: String = "UTC", isAllDay: Bool = false) -> Pattern? {
        guard let line = firstRule(from: rules) else { return nil }
        return parsePattern(fromLine: line, timeZoneIdentifier: timeZoneIdentifier, isAllDay: isAllDay)
    }

    public static func parsePattern(fromLine line: String, timeZoneIdentifier: String = "UTC", isAllDay: Bool = false) -> Pattern? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.uppercased().hasPrefix("RRULE:") else { return nil }
        let body = String(trimmed.dropFirst("RRULE:".count))
        var frequency: Frequency?
        var interval = 1
        var until: Date?
        var count: Int?
        var byWeekday: [Int] = []

        for token in body.split(separator: ";") {
            let parts = token.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { continue }
            let key = parts[0].uppercased()
            let value = parts[1]
            switch key {
            case "FREQ":
                frequency = Frequency(rawValue: value.uppercased())
            case "INTERVAL":
                interval = max(1, Int(value) ?? 1)
            case "UNTIL":
                until = parseUntil(value, timeZoneIdentifier: timeZoneIdentifier, isAllDay: isAllDay)
            case "COUNT":
                count = Int(value)
            case "BYDAY":
                byWeekday = value.split(separator: ",").compactMap { parseWeekday(String($0)) }
            default:
                break
            }
        }
        guard let frequency else { return nil }
        return Pattern(frequency: frequency, interval: interval, byWeekday: byWeekday, until: until, count: count)
    }

    public static func buildLine(
        pattern: Pattern,
        scheduleStart: Date,
        scheduleEnd: Date,
        timeZoneIdentifier: String,
        isAllDay: Bool
    ) -> String? {
        var tokens: [String] = ["FREQ=\(pattern.frequency.rawValue)"]
        if pattern.interval > 1 {
            tokens.append("INTERVAL=\(pattern.interval)")
        }
        if !pattern.byWeekday.isEmpty {
            tokens.append("BYDAY=\(pattern.byWeekday.map(weekdayToken).joined(separator: ","))")
        }
        if let count = pattern.count, pattern.until == nil {
            tokens.append("COUNT=\(count)")
        }
        if let until = pattern.until {
            tokens.append("UNTIL=\(formatUntil(until, isAllDay: isAllDay, timeZoneIdentifier: timeZoneIdentifier))")
        }
        return "RRULE:" + tokens.joined(separator: ";")
    }

    public static func summary(
        rules: [String],
        scheduleStartISO: String,
        scheduleEndISO: String,
        timeZoneIdentifier: String
    ) -> String {
        guard let line = firstRule(from: rules),
              let rule = RecurrenceRule(
                  startDateISO: scheduleStartISO,
                  endDateISO: scheduleEndISO,
                  recurrenceRule: line,
                  timeZoneIdentifier: timeZoneIdentifier
              )
        else {
            return ""
        }
        return rule.summary()
    }

    public static func inclusiveEndDate(_ date: Date, timeZoneIdentifier: String) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: timeZoneIdentifier) ?? .gmt
        let start = calendar.startOfDay(for: date)
        return (calendar.date(byAdding: .day, value: 1, to: start) ?? start).addingTimeInterval(-1)
    }

    private static func parseUntil(_ value: String, timeZoneIdentifier: String, isAllDay: Bool) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        let dateOnly = value.count == 8 || (value.count == 9 && value.hasSuffix("Z"))
        formatter.timeZone = dateOnly || !value.hasSuffix("Z")
            ? TimeZone(identifier: timeZoneIdentifier) ?? .gmt : .gmt
        if dateOnly {
            formatter.dateFormat = "yyyyMMdd"
        } else {
            formatter.dateFormat = value.hasSuffix("Z") ? "yyyyMMdd'T'HHmmss'Z'" : "yyyyMMdd'T'HHmmss"
        }
        let normalized = dateOnly ? String(value.prefix(8)) : value
        guard let date = formatter.date(from: normalized) else { return nil }
        return dateOnly && !isAllDay ? inclusiveEndDate(date, timeZoneIdentifier: timeZoneIdentifier) : date
    }

    private static func parseWeekday(_ token: String) -> Int? {
        let map: [String: Int] = [
            "MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6,
        ]
        let upper = token.uppercased()
        if let direct = map[upper] { return direct }
        if upper.count >= 2 {
            return map[String(upper.suffix(2))]
        }
        return nil
    }

    private static func weekdayToken(_ index: Int) -> String {
        switch index {
        case 0: "MO"
        case 1: "TU"
        case 2: "WE"
        case 3: "TH"
        case 4: "FR"
        case 5: "SA"
        default: "SU"
        }
    }

    private static func formatUntil(_ until: Date, isAllDay: Bool, timeZoneIdentifier: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = isAllDay ? TimeZone(identifier: timeZoneIdentifier) ?? .gmt : .gmt
        formatter.dateFormat = isAllDay ? "yyyyMMdd" : "yyyyMMdd'T'HHmmss'Z'"
        return formatter.string(from: until)
    }
}
