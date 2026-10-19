import Foundation

/// Closed-label date format for the sidebar event form. Matches web `formatEventFormDateLabel`.
public enum EventFormDateFormat {
    private static let labelFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateFormat = "MM.dd.yy"
        return formatter
    }()

    public static func formatLabel(for date: Date) -> String {
        labelFormatter.string(from: date)
    }

    /// Parses typed form dates using the same rules as go-to-date / web event form.
    public static func parseTypedLabel(_ text: String, now: Date) -> Date? {
        UserDateParsing.parseUserDate(text, now: now)
    }
}
