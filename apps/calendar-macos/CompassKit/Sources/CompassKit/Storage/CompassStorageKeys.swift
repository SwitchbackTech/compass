import Foundation

/// Device-local keys aligned with `apps/calendar-web/src/common/constants/storage.constants.ts`.
public enum CompassStorageKeys {
    public static let theme = "compass.theme"
    public static let defaultCalendarId = "compass.calendars.default-id"
    public static let defaultTimeZone = "compass.timezone.default"
    public static let timeTravelTimeZone = "compass.timezone.time-travel"
    public static let timezoneMismatchSnoozedBrowser = "compass.timezone.mismatch-snoozed-browser"
    public static let sidebarOpen = "compass.view.sidebar-open"
    public static let sidebarWidth = "compass.sidebar.width"
}
