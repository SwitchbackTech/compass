import XCTest
@testable import CompassKit

final class EventFormFieldVisibilityTests: XCTestCase {
    private var writableGoogle: EventFormFieldVisibilityInput {
        EventFormFieldVisibilityInput(
            mode: .edit,
            isReadOnly: false,
            isBusyContent: false,
            isScheduleLocked: false,
            calendarAccountEmail: "me@example.com",
            canInviteAttendees: true,
            canWriteCalendar: true,
            organizerEmail: "me@example.com",
            attendeeEmails: ["guest@example.com"],
            hasConferenceLink: false,
            creatableConferenceKind: nil,
            recurrenceKind: .single
        )
    }

    func testWritableFieldsOnNormalEdit() {
        for field: EventFormField in [.title, .location, .description, .start, .end, .color] {
            XCTAssertTrue(
                EventFormFieldVisibility.isVisible(field: field, input: writableGoogle),
                "\(field.rawValue) should be visible"
            )
        }
    }

    func testRecurrenceHiddenOnSingleInstanceEdit() {
        XCTAssertFalse(
            EventFormFieldVisibility.isVisible(field: .recurrence, input: writableGoogle))
        var series = writableGoogle
        series.recurrenceKind = .series
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .recurrence, input: series))
    }

    func testRecurrenceShownOnCreate() {
        var create = writableGoogle
        create.mode = .create
        create.recurrenceKind = .single
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .recurrence, input: create))
    }

    func testRsvpWhenSelfInAttendeeList() {
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .rsvp, input: writableGoogle))
        var withSelf = writableGoogle
        withSelf.attendeeEmails = ["me@example.com", "guest@example.com"]
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .rsvp, input: withSelf))
    }

    func testRsvpHiddenWithoutAttendees() {
        var empty = writableGoogle
        empty.attendeeEmails = []
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .rsvp, input: empty))
    }

    func testGuestsHiddenWhenNotOrganizer() {
        var invitee = writableGoogle
        invitee.organizerEmail = "host@example.com"
        invitee.attendeeEmails = ["me@example.com"]
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .attendees, input: invitee))
    }

    func testGuestsWhenOrganizerCanInvite() {
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .attendees, input: writableGoogle))
    }

    func testMeetingLinkOnEditRequiresUrl() {
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .conference, input: writableGoogle))
        var withLink = writableGoogle
        withLink.hasConferenceLink = true
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .conference, input: withLink))
    }

    func testAddMeetOnCreateWhenSupported() {
        var create = writableGoogle
        create.mode = .create
        create.creatableConferenceKind = .meet
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .conference, input: create))
        create.creatableConferenceKind = nil
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .conference, input: create))
    }

    func testReadOnlyKeepsRsvpAndJoinLink() {
        var readOnly = writableGoogle
        readOnly.isReadOnly = true
        readOnly.attendeeEmails = ["me@example.com"]
        readOnly.hasConferenceLink = true
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .title, input: readOnly))
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .rsvp, input: readOnly))
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .conference, input: readOnly))
    }

    func testScheduleLockedHidesScheduleFields() {
        var locked = writableGoogle
        locked.isScheduleLocked = true
        locked.recurrenceKind = .series
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .start, input: locked))
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .end, input: locked))
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .recurrence, input: locked))
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .title, input: locked))
    }

    func testBusyContentHidesMutatingFields() {
        var busy = writableGoogle
        busy.isBusyContent = true
        busy.isReadOnly = true
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .title, input: busy))
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .rsvp, input: busy))
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .conference, input: busy))
    }

    func testCalendarPickerCreateOnly() {
        XCTAssertFalse(EventFormFieldVisibility.isVisible(field: .calendar, input: writableGoogle))
        var create = writableGoogle
        create.mode = .create
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .calendar, input: create))
    }

    func testActionsAlwaysVisible() {
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .actions, input: writableGoogle))
        var readOnly = writableGoogle
        readOnly.isReadOnly = true
        XCTAssertTrue(EventFormFieldVisibility.isVisible(field: .actions, input: readOnly))
    }
}
