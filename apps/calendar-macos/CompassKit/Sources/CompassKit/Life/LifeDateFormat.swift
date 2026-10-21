import Foundation

/// Web `DatePicker dateFormat="MMM d, yyyy"` for the Life date of birth. The
/// stored value stays `yyyy-MM-dd`; this only changes what people see and type.
public enum LifeDateFormat {
    private static let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]

    /// `2026-06-10` becomes `Jun 10, 2026`; anything else is returned unchanged.
    public static func display(_ stored: String) -> String {
        guard let date = LifeMath.parseLifeDate(stored) else { return stored }
        let calendar = EffectiveTimeZone.calendar
        let year = calendar.component(.year, from: date)
        let month = calendar.component(.month, from: date)
        let day = calendar.component(.day, from: date)
        return "\(months[month - 1]) \(day), \(year)"
    }

    /// Accepts `yyyy-MM-dd` or `MMM d, yyyy` (comma optional) and returns `yyyy-MM-dd`.
    public static func storedValue(from typed: String) -> String? {
        let trimmed = typed.trimmingCharacters(in: .whitespacesAndNewlines)
        if LifeMath.parseLifeDate(trimmed) != nil { return trimmed }
        let parts = trimmed.replacingOccurrences(of: ",", with: " ")
            .split(separator: " ", omittingEmptySubsequences: true).map(String.init)
        guard parts.count == 3,
              let month = months.firstIndex(where: { $0.caseInsensitiveCompare(String(parts[0].prefix(3))) == .orderedSame }),
              parts[0].count >= 3,
              let day = Int(parts[1]), let year = Int(parts[2])
        else { return nil }
        let value = String(format: "%04d-%02d-%02d", year, month + 1, day)
        return LifeMath.parseLifeDate(value) == nil ? nil : value
    }
}
