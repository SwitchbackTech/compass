import Foundation

/// Web `EventFormDateField` keys on the closed date field: ↓ opens the
/// calendar, ↑ / Shift+↓ / Mod+↓ nudge the day, and Enter or Space on the
/// date already shown opens the calendar instead of committing. Once open,
/// `calendarAction` moves a day cursor like web `react-datepicker`.
public enum EventFormDateFieldKeys {
    public enum Key: Sendable {
        case downArrow, upArrow, enter, space
    }

    public struct Modifiers: OptionSet, Sendable {
        public let rawValue: Int
        public init(rawValue: Int) { self.rawValue = rawValue }
        public static let shift = Modifiers(rawValue: 1 << 0)
        /// Command, Control, or Option.
        public static let mod = Modifiers(rawValue: 1 << 1)
    }

    public enum Action: Equatable, Sendable {
        case openCalendar
        case nudgeDays(Int)
        /// Let the field handle it (typing, onSubmit commit, Mod+Enter save).
        case ignore
    }

    public static func action(
        for key: Key,
        modifiers: Modifiers,
        text: String,
        committedDate: Date
    ) -> Action {
        switch key {
        case .downArrow:
            if modifiers.contains(.shift) { return .nudgeDays(7) }
            if modifiers.contains(.mod) { return .nudgeDays(1) }
            return .openCalendar
        case .upArrow:
            return .nudgeDays(modifiers.contains(.shift) ? -7 : -1)
        case .enter:
            guard !modifiers.contains(.mod) else { return .ignore }
            return showsCommittedDay(text, committedDate) ? .openCalendar : .ignore
        case .space:
            let shown = EventFormDateFormat.formatLabel(for: committedDate)
            return text == shown ? .openCalendar : .ignore
        }
    }

    public enum CalendarKey: Sendable {
        case leftArrow, rightArrow, upArrow, downArrow, enter, space, escape
    }

    public enum CalendarAction: Equatable, Sendable {
        case moveCursor(days: Int)
        case pickCursor
        case close
    }

    /// Web `react-datepicker` keys while the calendar is open: ← → move a
    /// day, ↑ ↓ a week, Enter or Space picks the cursor day, Esc closes.
    public static func calendarAction(for key: CalendarKey) -> CalendarAction {
        switch key {
        case .leftArrow: .moveCursor(days: -1)
        case .rightArrow: .moveCursor(days: 1)
        case .upArrow: .moveCursor(days: -7)
        case .downArrow: .moveCursor(days: 7)
        case .enter, .space: .pickCursor
        case .escape: .close
        }
    }

    /// The form date field holding keyboard focus. Web `EventFormDateField`
    /// consumes its keys before the form sees them, so the form's key router
    /// lets them through to the field.
    public struct Owner: Equatable, Sendable {
        public var fieldId: String
        public var calendarOpen: Bool

        public init(fieldId: String, calendarOpen: Bool) {
            self.fieldId = fieldId
            self.calendarOpen = calendarOpen
        }
    }

    /// Plain Return belongs to the field (commit, or open the calendar), not
    /// the form's Enter-saves; with the calendar open, Esc, arrows, and Space
    /// belong to it too.
    public static func fieldOwnsKey(_ event: KeyEvent, owner: Owner?) -> Bool {
        guard let owner, event.modifiers.isEmpty else { return false }
        switch event.key {
        case .named(.enter):
            return true
        case .named(.escape), .named(.arrowUp), .named(.arrowDown), .named(.arrowLeft), .named(.arrowRight),
            .character(" "):
            return owner.calendarOpen
        default:
            return false
        }
    }

    /// Web `commitOrRevert` returning "unchanged": the text parses to the day
    /// already committed.
    private static func showsCommittedDay(_ text: String, _ committedDate: Date) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let parsed = EventFormDateFormat.parseTypedLabel(trimmed, now: committedDate) else {
            return false
        }
        return EffectiveTimeZone.calendar.isDate(parsed, inSameDayAs: committedDate)
    }
}
