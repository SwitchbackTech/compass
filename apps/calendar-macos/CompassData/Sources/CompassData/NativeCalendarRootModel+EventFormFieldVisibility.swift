import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public func eventFormFieldVisibilityInput() -> EventFormFieldVisibilityInput? {
        if let draft = draftStore.gridDraft {
            return eventFormFieldVisibilityInput(for: draft)
        }
        if let event = focusedEvent() {
            return eventFormFieldVisibilityInput(for: event)
        }
        return nil
    }

    public func visibleEditSequenceLetterFields() -> [ShortcutRegistry.EditSequenceFieldRow] {
        guard let input = eventFormFieldVisibilityInput() else { return [] }
        return EventFormFieldVisibility.visibleLetterFields(
            rows: shortcutRegistry.editSequenceFields,
            input: input
        )
    }

    public func isEventFormFocusFieldVisible(_ field: EventFormField) -> Bool {
        guard let input = eventFormFieldVisibilityInput() else { return false }
        return EventFormFieldVisibility.isVisible(field: field, input: input)
    }

    public func eventFormFieldVisibilityInput(for draft: GridEventDraft) -> EventFormFieldVisibilityInput {
        let baseline = baselineEvent(for: draft)
        let isBusy = baseline.map { event in
            if case .busy = event.content { return true }
            return false
        } ?? false
        let details: EventContent_DetailsPayload? = {
            guard let baseline, case .details(let payload) = baseline.content else { return nil }
            return payload
        }()
        let calendar = attendeeCalendar(for: draft)
        let capabilities = calendar?.capabilities
        let isReadOnly = isEventFormReadOnly(for: draft)
        let creatable: EventFormFieldVisibilityInput.CreatableConferenceKind? = {
            guard draft.kind == .create, !isReadOnly,
                let kind = CalendarCapabilities.creatableConferenceKind(on: calendar)
            else { return nil }
            return EventFormFieldVisibilityInput.CreatableConferenceKind(from: kind)
        }()

        return EventFormFieldVisibilityInput(
            mode: draft.kind == .create ? .create : .edit,
            isReadOnly: isReadOnly,
            isBusyContent: isBusy,
            isScheduleLocked: isScheduleLocked(for: draft),
            calendarAccountEmail: calendar?.accountEmail,
            canInviteAttendees: capabilities?.canInviteAttendees ?? false,
            canWriteCalendar: capabilities?.canWrite ?? false,
            organizerEmail: details?.organizer?.email,
            attendeeEmails: (details?.attendees ?? []).map(\.email),
            hasConferenceLink: details?.conference?.url != nil,
            creatableConferenceKind: creatable,
            recurrenceKind: recurrenceKind(for: baseline)
        )
    }

    public func eventFormFieldVisibilityInput(for event: Event) -> EventFormFieldVisibilityInput {
        let lookup = CalendarLookupBuilder.build(calendars)
        let calendar = lookup[event.calendarId.rawValue]
        let isBusy: Bool = {
            if case .busy = event.content { return true }
            return false
        }()
        let details: EventContent_DetailsPayload? = {
            guard case .details(let payload) = event.content else { return nil }
            return payload
        }()
        let isReadOnly = GridEventAccess.isEventReadOnly(
            lookup: lookup,
            calendarId: event.calendarId,
            isBusy: isBusy
        )

        return EventFormFieldVisibilityInput(
            mode: .edit,
            isReadOnly: isReadOnly,
            isBusyContent: isBusy,
            isScheduleLocked: event.providerManaged == true,
            calendarAccountEmail: calendar?.accountEmail,
            canInviteAttendees: calendar?.capabilities.canInviteAttendees ?? false,
            canWriteCalendar: calendar?.capabilities.canWrite ?? false,
            organizerEmail: details?.organizer?.email,
            attendeeEmails: (details?.attendees ?? []).map(\.email),
            hasConferenceLink: details?.conference?.url != nil,
            creatableConferenceKind: nil,
            recurrenceKind: recurrenceKind(for: event)
        )
    }

    private func recurrenceKind(for event: Event?) -> EventFormFieldVisibilityInput.RecurrenceKind {
        guard let event else { return .single }
        switch event.recurrence {
        case .series:
            return .series
        case .occurrence:
            return .occurrence
        case .single:
            return .single
        }
    }
}

private extension EventFormFieldVisibilityInput.CreatableConferenceKind {
    init?(from kind: ConferenceKindsEnum) {
        switch kind {
        case .meet: self = .meet
        case .teams: self = .teams
        }
    }
}
