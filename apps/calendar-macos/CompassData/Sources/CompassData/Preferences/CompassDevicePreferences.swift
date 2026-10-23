import CompassKit
import Foundation

public protocol CompassDevicePreferencesStorage: Sendable {
    func string(forKey key: String) -> String?
    func set(_ value: String?, forKey key: String)
    func removeObject(forKey key: String)
}

extension UserDefaults: CompassDevicePreferencesStorage {}

public enum CompassDevicePreferences {
    public static func readTheme(from storage: CompassDevicePreferencesStorage = UserDefaults.standard)
        -> CompassThemeName?
    {
        guard let raw = storage.string(forKey: CompassStorageKeys.theme) else {
            return nil
        }
        return CompassThemeName(rawValue: raw)
    }

    @discardableResult
    public static func writeTheme(
        _ theme: CompassThemeName,
        to storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> Bool {
        storage.set(theme.rawValue, forKey: CompassStorageKeys.theme)
        return true
    }

    public static func readDefaultCalendarId(
        from storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> String? {
        guard let raw = storage.string(forKey: CompassStorageKeys.defaultCalendarId),
              !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            return nil
        }
        return raw
    }

    @discardableResult
    public static func writeDefaultCalendarId(
        _ calendarId: String?,
        to storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> Bool {
        if let calendarId {
            storage.set(calendarId, forKey: CompassStorageKeys.defaultCalendarId)
        } else {
            storage.removeObject(forKey: CompassStorageKeys.defaultCalendarId)
        }
        return true
    }

    public static func readPinnedTimeZone(
        from storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> String? {
        guard let raw = storage.string(forKey: CompassStorageKeys.defaultTimeZone),
              TimeZoneFormatting.isValidTimeZone(raw)
        else {
            return nil
        }
        return raw
    }

    /// Drops parity-style UTC pins unless the user kept UTC via the mismatch banner.
    public static func readPinnedTimeZoneResolvingAccidentalUtc(
        from storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> String? {
        guard let pinned = readPinnedTimeZone(from: storage) else { return nil }
        guard TimeZoneFormatting.isUtcLikeTimeZone(pinned) else { return pinned }
        let snoozed = storage.string(forKey: CompassStorageKeys.timezoneMismatchSnoozedBrowser)
        if let snoozed, !TimeZoneFormatting.isUtcLikeTimeZone(snoozed) {
            return pinned
        }
        let browser = TimeZone.current.identifier
        if TimeZoneFormatting.isUtcLikeTimeZone(browser) {
            writePinnedTimeZone(nil, to: storage)
            return nil
        }
        if snoozed == browser { return pinned }
        writePinnedTimeZone(nil, to: storage)
        return nil
    }

    @discardableResult
    public static func writePinnedTimeZone(
        _ timeZone: String?,
        to storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> Bool {
        if let timeZone {
            guard TimeZoneFormatting.isValidTimeZone(timeZone) else { return false }
            storage.set(timeZone, forKey: CompassStorageKeys.defaultTimeZone)
        } else {
            storage.removeObject(forKey: CompassStorageKeys.defaultTimeZone)
        }
        return true
    }

    public static func readTimeTravelTimeZone(
        from storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> String? {
        guard let raw = storage.string(forKey: CompassStorageKeys.timeTravelTimeZone),
              TimeZoneFormatting.isValidTimeZone(raw)
        else {
            return nil
        }
        return raw
    }

    @discardableResult
    public static func writeTimeTravelTimeZone(
        _ timeZone: String?,
        to storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> Bool {
        if let timeZone {
            guard TimeZoneFormatting.isValidTimeZone(timeZone) else { return false }
            storage.set(timeZone, forKey: CompassStorageKeys.timeTravelTimeZone)
        } else {
            storage.removeObject(forKey: CompassStorageKeys.timeTravelTimeZone)
        }
        return true
    }

    /// Web `SIDEBAR_MIN_WIDTH`, `SIDEBAR_DEFAULT_WIDTH`, and `SIDEBAR_MAX_WIDTH`.
    public static let sidebarWidthRange: ClosedRange<Double> = 240...480
    public static let defaultSidebarWidth: Double = 345

    public static func clampSidebarWidth(_ width: Double) -> Double {
        min(sidebarWidthRange.upperBound, max(sidebarWidthRange.lowerBound, width))
    }

    /// Open unless stored as "false", like the web's `readSidebarOpen`.
    public static func readSidebarOpen(
        from storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> Bool {
        storage.string(forKey: CompassStorageKeys.sidebarOpen) != "false"
    }

    public static func writeSidebarOpen(
        _ isOpen: Bool,
        to storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) {
        storage.set(isOpen ? "true" : "false", forKey: CompassStorageKeys.sidebarOpen)
    }

    /// Stored as a rounded number string like the web; missing or invalid
    /// values fall back to the default, and stored values are clamped.
    public static func readSidebarWidth(
        from storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) -> Double {
        guard let raw = storage.string(forKey: CompassStorageKeys.sidebarWidth),
              let width = Double(raw), width.isFinite
        else {
            return defaultSidebarWidth
        }
        return clampSidebarWidth(width.rounded())
    }

    public static func writeSidebarWidth(
        _ width: Double,
        to storage: CompassDevicePreferencesStorage = UserDefaults.standard
    ) {
        storage.set(String(Int(clampSidebarWidth(width).rounded())), forKey: CompassStorageKeys.sidebarWidth)
    }
}
