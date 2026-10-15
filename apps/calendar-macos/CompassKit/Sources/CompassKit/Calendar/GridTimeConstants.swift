import Foundation

public enum GridTimeConstants {
    /// Hours one viewport shows (web `TIMED_VISIBLE_HOURS`); the scroll
    /// document still spans the whole day.
    public static let timedVisibleHours = 13
    public static let timedDayHours = 24
    public static let gridPaddingBottom = 20.0
    /// Weekday header row above the all-day strip. AppKit layout, chip Y, and
    /// demo scroll all add this before timed-content document Y.
    public static let dayHeaderRowHeight = 28.0

    public static func timedContentDocumentYOffset(allDayRowHeight: Double) -> Double {
        dayHeaderRowHeight + allDayRowHeight
    }
}
