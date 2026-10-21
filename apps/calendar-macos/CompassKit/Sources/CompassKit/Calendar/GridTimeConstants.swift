import Foundation

public enum GridTimeConstants {
    /// Hours one viewport shows (web `TIMED_VISIBLE_HOURS`); the scroll
    /// document still spans the whole day.
    public static let timedVisibleHours = 13
    public static let timedDayHours = 24
    public static let gridPaddingBottom = 20.0
    /// Weekday header row above the all-day strip. Together with the all-day
    /// row it forms the pinned band above the scrolling timed grid.
    public static let dayHeaderRowHeight = 28.0

    public static func timedContentDocumentYOffset(allDayRowHeight: Double) -> Double {
        dayHeaderRowHeight + allDayRowHeight
    }

    /// Pixel top inside the timed track (1 AM origin). Web `timedGridTopPx`.
    public static func timedGridTopPx(
        minutesFromCivilMidnight: Int,
        hourHeight: Double
    ) -> Double {
        let minutesFromOneAm = max(0, minutesFromCivilMidnight - 60)
        return (Double(minutesFromOneAm) / 60) * hourHeight
    }
}
