import CompassKit
import Foundation

/// One account's calendars in the sidebar. Signed-out calendars share a
/// single group with no account heading.
public struct CalendarListGroup: Identifiable, Sendable {
    /// Web `accountKey`: `provider:email`, or "local" with no account.
    public let id: String
    public let account: String?
    public let calendars: [CompassCalendar]
}

/// Web `CalendarList`: grouping, collapse, and number-key picks.
extension NativeCalendarRootModel {
    /// Same key as the web's `STORAGE_KEYS.COLLAPSED_ACCOUNTS`.
    static let collapsedAccountsKey = "compass.calendars.collapsed-accounts"
    /// Web `PICK_KEY_LABELS`: the first 12 rows of a focused list.
    public static let calendarPickKeys: [Character] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="]

    public var calendarListGroups: [CalendarListGroup] {
        var order: [String] = []
        var byKey: [String: (account: String?, calendars: [CompassCalendar])] = [:]
        for calendar in sidebarCalendars {
            let account = isSignedIn ? calendar.accountEmail : nil
            let key = account.map { "\(calendar.provider):\($0)" } ?? "local"
            if byKey[key] == nil {
                order.append(key)
                byKey[key] = (account, [])
            }
            byKey[key]?.calendars.append(calendar)
        }
        return order.compactMap { key in
            byKey[key].map { CalendarListGroup(id: key, account: $0.account, calendars: $0.calendars) }
        }
    }

    public func isAccountCollapsed(_ key: String) -> Bool {
        collapsedAccountKeys.contains(key)
    }

    public func toggleAccountCollapsed(_ key: String) {
        if collapsedAccountKeys.contains(key) {
            collapsedAccountKeys.remove(key)
        } else {
            collapsedAccountKeys.insert(key)
        }
        UserDefaults.standard.set(collapsedAccountKeys.sorted(), forKey: Self.collapsedAccountsKey)
    }

    /// The "calendars" page jump or a click focuses a list; nil picks the first.
    public func focusCalendarList(_ key: String? = nil) {
        focusedCalendarListKey = key ?? calendarListGroups.first?.id
    }

    /// Tab moves focus to the next list, wrapping around.
    public func focusNextCalendarList() {
        let keys = calendarListGroups.map(\.id)
        guard !keys.isEmpty else { return }
        let index = focusedCalendarListKey.flatMap { keys.firstIndex(of: $0) } ?? -1
        focusedCalendarListKey = keys[(index + 1) % keys.count]
    }

    public func clearCalendarListFocus() {
        focusedCalendarListKey = nil
    }

    /// The key chip for a row, shown only while its list has focus.
    public func calendarPickKey(groupKey: String, index: Int) -> Character? {
        guard focusedCalendarListKey == groupKey, index < Self.calendarPickKeys.count else { return nil }
        return Self.calendarPickKeys[index]
    }

    /// Toggles the row a pick key names in the focused list. False when the
    /// key names no visible row.
    @discardableResult
    public func pickCalendar(key: Character) -> Bool {
        guard let focusKey = focusedCalendarListKey,
              !isAccountCollapsed(focusKey),
              let group = calendarListGroups.first(where: { $0.id == focusKey }),
              let index = Self.calendarPickKeys.firstIndex(of: key),
              index < group.calendars.count
        else { return false }
        toggleCalendarVisibility(group.calendars[index])
        recordShortcut(.focusCalendarDigit)
        return true
    }
}
