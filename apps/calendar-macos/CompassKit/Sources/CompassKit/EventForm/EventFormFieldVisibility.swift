import Foundation

/// Mirrors `@core/event/event-form-field-visibility`.
public struct EventFormFieldVisibilityInput: Sendable, Equatable {
    public enum Mode: String, Sendable {
        case create
        case edit
    }

    public enum RecurrenceKind: String, Sendable {
        case single
        case series
        case occurrence
    }

    public enum CreatableConferenceKind: String, Sendable {
        case meet
        case teams
    }

    public var mode: Mode
    public var isReadOnly: Bool
    public var isBusyContent: Bool
    public var isScheduleLocked: Bool
    public var calendarAccountEmail: String?
    public var canInviteAttendees: Bool
    public var canWriteCalendar: Bool
    public var organizerEmail: String?
    public var attendeeEmails: [String]
    public var hasConferenceLink: Bool
    public var creatableConferenceKind: CreatableConferenceKind?
    public var recurrenceKind: RecurrenceKind

    public init(
        mode: Mode,
        isReadOnly: Bool,
        isBusyContent: Bool,
        isScheduleLocked: Bool,
        calendarAccountEmail: String? = nil,
        canInviteAttendees: Bool = false,
        canWriteCalendar: Bool = false,
        organizerEmail: String? = nil,
        attendeeEmails: [String] = [],
        hasConferenceLink: Bool = false,
        creatableConferenceKind: CreatableConferenceKind? = nil,
        recurrenceKind: RecurrenceKind = .single
    ) {
        self.mode = mode
        self.isReadOnly = isReadOnly
        self.isBusyContent = isBusyContent
        self.isScheduleLocked = isScheduleLocked
        self.calendarAccountEmail = calendarAccountEmail
        self.canInviteAttendees = canInviteAttendees
        self.canWriteCalendar = canWriteCalendar
        self.organizerEmail = organizerEmail
        self.attendeeEmails = attendeeEmails
        self.hasConferenceLink = hasConferenceLink
        self.creatableConferenceKind = creatableConferenceKind
        self.recurrenceKind = recurrenceKind
    }
}

public enum EventFormFieldVisibility {
    private static func writableContent(_ input: EventFormFieldVisibilityInput) -> Bool {
        !input.isReadOnly && !input.isBusyContent
    }

    private static func scheduleEditable(_ input: EventFormFieldVisibilityInput) -> Bool {
        writableContent(input) && !input.isScheduleLocked
    }

    private static func organizesEvent(_ input: EventFormFieldVisibilityInput) -> Bool {
        if input.mode == .create { return true }
        guard let organizerEmail = input.organizerEmail else { return true }
        guard let accountEmail = input.calendarAccountEmail else { return false }
        return organizerEmail.lowercased() == accountEmail.lowercased()
    }

    private static func canInviteOnCalendar(_ input: EventFormFieldVisibilityInput) -> Bool {
        input.canInviteAttendees && input.canWriteCalendar
    }

    private static func showRsvpControl(_ input: EventFormFieldVisibilityInput) -> Bool {
        guard input.mode == .edit, let accountEmail = input.calendarAccountEmail else { return false }
        let selfLower = accountEmail.lowercased()
        return input.attendeeEmails.contains { $0.lowercased() == selfLower }
    }

    private static func showRecurrenceField(_ input: EventFormFieldVisibilityInput) -> Bool {
        guard scheduleEditable(input) else { return false }
        if input.mode == .create { return true }
        return input.recurrenceKind != .single
    }

    private static func showConferenceField(_ input: EventFormFieldVisibilityInput) -> Bool {
        if input.mode == .create {
            return writableContent(input) && input.creatableConferenceKind != nil
        }
        return input.hasConferenceLink
    }

    public static func isVisible(
        field: EventFormField,
        input: EventFormFieldVisibilityInput
    ) -> Bool {
        switch field {
        case .title, .location, .description, .color:
            return writableContent(input)
        case .start, .end:
            return scheduleEditable(input)
        case .recurrence:
            return showRecurrenceField(input)
        case .calendar:
            return input.mode == .create
        case .conference:
            return showConferenceField(input)
        case .attendees:
            return writableContent(input)
                && canInviteOnCalendar(input)
                && organizesEvent(input)
        case .rsvp:
            return showRsvpControl(input)
        case .actions:
            return true
        }
    }

    public static func visibleLetterFields(
        rows: [ShortcutRegistry.EditSequenceFieldRow],
        input: EventFormFieldVisibilityInput
    ) -> [ShortcutRegistry.EditSequenceFieldRow] {
        rows.filter { row in
            guard row.secondKey != nil,
                let field = EventFormField(rawValue: row.field)
            else { return false }
            return isVisible(field: field, input: input)
        }
    }

    public static func visibleDigitRows(
        rows: [ShortcutRegistry.EditSequenceFieldRow],
        input: EventFormFieldVisibilityInput
    ) -> [ShortcutRegistry.EditSequenceFieldRow] {
        rows.filter { field in
            guard let formField = EventFormField(rawValue: field.field) else { return false }
            return isVisible(field: formField, input: input)
        }
    }
}
