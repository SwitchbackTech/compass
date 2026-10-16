import Foundation

/// Cursor rules shared by the sidebar's month buttons and keyboard navigation.
public enum MonthPickerCursor {
    public static func normalize(_ date: Date, isWeek: Bool, weekStart: Int, calendar: Calendar) -> Date {
        let day = calendar.startOfDay(for: date)
        guard isWeek else { return day }
        let offset = (calendar.component(.weekday, from: day) - weekStart + 7) % 7
        return calendar.date(byAdding: .day, value: -offset, to: day) ?? day
    }

    public static func jump(
        from cursor: Date, to month: Date, isWeek: Bool, weekStart: Int, calendar: Calendar
    ) -> Date {
        guard let interval = calendar.dateInterval(of: .month, for: month),
              let days = calendar.range(of: .day, in: .month, for: month),
              let sameDay = calendar.date(
                  byAdding: .day,
                  value: min(calendar.component(.day, from: cursor), days.count) - 1,
                  to: interval.start)
        else { return cursor }
        let anchored = normalize(sameDay, isWeek: isWeek, weekStart: weekStart, calendar: calendar)
        if isWeek, anchored < interval.start {
            return calendar.date(byAdding: .day, value: 7, to: anchored) ?? anchored
        }
        return anchored
    }
}
