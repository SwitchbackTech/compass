import Foundation

/// Geometry for desktop ↔ web parity screenshots. Keep in sync with
/// `e2e/parity/seed-demo-fixture.util.ts` and `apps/calendar-web/src/index.html`
/// boot track math (1280×820, sidebar open @ 345px, content pl-8).
public enum ParityCaptureGeometry {
    public static let viewportWidth: Double = 1280
    public static let contentLeadingInset: Double = 32
    public static let sidebarDividerWidth: Double = 32
    public static let defaultSidebarWidth: Double = 345
    public static let gridMarginLeft: Double = Double(GridMetrics.gridMarginLeft)

    /// Width of the week grid track (excluding sidebar chrome).
    public static var contentTrackWidth: Double {
        viewportWidth - contentLeadingInset - (sidebarDividerWidth + defaultSidebarWidth)
    }

    public static var visibleDayCount: Int {
        CalendarWindowMath.computeVisibleDayCount(
            trackWidth: contentTrackWidth,
            marginLeft: gridMarginLeft
        )
    }

    /// Web week view uses Day.js `startOf("week")` (Sunday) in the demo timezone.
    public static func weekViewStart(containing date: Date) -> Date {
        var calendar = EffectiveTimeZone.calendar
        calendar.firstWeekday = 1
        calendar.minimumDaysInFirstWeek = 1
        let startOfDay = calendar.startOfDay(for: date)
        let weekday = calendar.component(.weekday, from: startOfDay)
        let daysFromSunday = (weekday - calendar.firstWeekday + 7) % 7
        return calendar.date(byAdding: .day, value: -daysFromSunday, to: startOfDay) ?? startOfDay
    }
}
