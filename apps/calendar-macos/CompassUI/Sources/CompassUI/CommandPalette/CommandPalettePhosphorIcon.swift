import CompassData
import CompassKit

/// Maps palette rows to exported Phosphor icons so macOS matches web command palette glyphs.
enum CommandPalettePhosphorIcon {
    static func icon(for item: CommandPaletteItem) -> PhosphorIcon? {
        if item.id.hasPrefix("event-") || item.id.hasPrefix("recent-event-") {
            return .calendar
        }
        if item.id.hasPrefix("recent-") {
            let baseId = String(item.id.dropFirst("recent-".count))
            return icon(for: CommandPaletteItem(id: baseId, label: item.label, systemImage: item.systemImage))
        }
        switch item.id {
        case "go-to-date", "open-up-next", "show-booking", "book-personal-onboarding":
            return .calendar
        case "today":
            return .arrowUDownLeft
        case "go-to-day", "focus-month-picker":
            return .calendarDots
        case "go-to-week":
            return .calendar
        case "go-to-life":
            return .hourglassSimple
        case "show-shortcuts":
            return .keyboard
        case "practice-shortcuts", "show-welcome-guide":
            return .compass
        case "toggle-shortcut-tips", "toggle-shortcut-level":
            return item.label.hasPrefix("Show") ? .eye : .eyeSlash
        case "toggle-sidebar":
            return .sidebarSimple
        case "join-up-next-meeting":
            return .videoCamera
        case "create-event", "create-allday-event":
            return .plus
        case "undo-last-change":
            return .arrowCounterClockwise
        case "redo-last-change":
            return .arrowClockwise
        case "toggle-theme":
            return item.label.contains("dark") ? .moonStars : .sun
        case "show-accounts", "sign-up", "log-in", "log-out":
            return .users
        case "open-settings":
            return .gear
        case "about":
            return .info
        case "share-feedback":
            return nil
        default:
            return mapSystemImage(item.systemImage)
        }
    }

    private static func mapSystemImage(_ name: String?) -> PhosphorIcon? {
        switch name {
        case "calendar", "calendar.badge.checkmark", "calendar.badge.plus":
            return .calendar
        case "calendar.day.timeline.left":
            return .calendarDots
        case "arrow.uturn.backward":
            return .arrowUDownLeft
        case "keyboard":
            return .keyboard
        case "safari":
            return .compass
        case "eye":
            return .eye
        case "eye.slash":
            return .eyeSlash
        case "sidebar.left":
            return .sidebarSimple
        case "video":
            return .videoCamera
        case "plus":
            return .plus
        case "arrow.counterclockwise":
            return .arrowCounterClockwise
        case "arrow.clockwise":
            return .arrowClockwise
        case "sun.max":
            return .sun
        case "moon.stars":
            return .moonStars
        case "gearshape":
            return .gear
        case "info.circle":
            return .info
        case "person.2", "person.badge.plus":
            return .users
        case "hourglass":
            return .hourglassSimple
        default:
            return nil
        }
    }
}
