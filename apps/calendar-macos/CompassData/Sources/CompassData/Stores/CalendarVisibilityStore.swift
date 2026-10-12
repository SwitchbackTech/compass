// Mirrors `apps/calendar-web/src/calendars/calendar-visibility.store.ts`:
// visibility is client-owned. Server `isVisible` is ignored, and hiding a
// calendar never writes to the server.

import Foundation

@MainActor
@Observable
public final class CalendarVisibilityStore {
    /// Same key as the web's `STORAGE_KEYS.HIDDEN_CALENDAR_IDS`.
    static let storageKey = "compass.calendars.hidden-ids"

    public private(set) var hiddenCalendarIds: Set<String>
    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        hiddenCalendarIds = Set(defaults.stringArray(forKey: Self.storageKey) ?? [])
    }

    public func isVisible(_ calendarId: String) -> Bool {
        !hiddenCalendarIds.contains(calendarId)
    }

    public func setVisible(_ calendarId: String, _ visible: Bool) {
        if visible {
            hiddenCalendarIds.remove(calendarId)
        } else {
            hiddenCalendarIds.insert(calendarId)
        }
        defaults.set(hiddenCalendarIds.sorted(), forKey: Self.storageKey)
    }
}
