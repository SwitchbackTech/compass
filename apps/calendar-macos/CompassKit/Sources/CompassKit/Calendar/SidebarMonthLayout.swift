import Foundation

/// The sidebar aligns week rows to the visible window, including shifted weeks.
public enum SidebarMonthLayout {
    public static func days(in month: Date, weekStart: Int, calendar: Calendar) -> [Date] {
        guard let interval = calendar.dateInterval(of: .month, for: month) else { return [] }
        let offset = (calendar.component(.weekday, from: interval.start) - weekStart + 7) % 7
        guard let start = calendar.date(byAdding: .day, value: -offset, to: interval.start),
              let lastDay = calendar.date(byAdding: .day, value: -1, to: interval.end)
        else { return [] }
        let count = ((offset + calendar.component(.day, from: lastDay) + 6) / 7) * 7
        return (0 ..< count).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }
}
