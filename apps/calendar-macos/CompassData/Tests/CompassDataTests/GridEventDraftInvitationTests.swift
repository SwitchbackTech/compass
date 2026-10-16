@testable import CompassData
import CompassKit
import XCTest

final class GridEventDraftInvitationTests: XCTestCase {
    func testCreateInputCarriesInvitationWhenGuestsChanged() {
        let draft = GridEventDraft(
            clientId: EventId(rawValue: "abc123abc123abc123abc123"),
            schedule: DraftSchedule(start: Date(), end: Date().addingTimeInterval(3600), kind: .timed),
            title: "Meet",
            calendarId: CalendarId(rawValue: "cal1"),
            attendees: [DraftAttendeeInput(email: "ada@example.com", displayName: "Ada")]
        )

        let input = GridEventDraftMapping.createInput(from: draft, invitation: .all)
        XCTAssertEqual(input?.invitation, .all)
        XCTAssertEqual(input?.content.attendees?.first?.email, "ada@example.com")
    }

    func testGuestsChangedDetectsMembershipDelta() {
        let baseline = sampleEvent(attendees: [
            EventContentDetailsAttendees(displayName: nil, email: "ada@example.com", responseStatus: .needsAction),
        ])
        var draft = GridEventDraftFromEvent.editDraft(from: baseline)!
        draft.attendees = [
            DraftAttendeeInput(email: "ada@example.com", displayName: nil),
            DraftAttendeeInput(email: "bob@example.com", displayName: nil),
        ]
        XCTAssertTrue(GridEventDraftGuests.guestsChanged(draft: draft, baseline: baseline))
    }

    func testOptimisticEditPreservesProviderDetailsAndGuestResponses() throws {
        let source = sampleEvent(attendees: [])
        let details = EventContent_DetailsPayload(
            attendees: [.init(displayName: "Ada", email: "ada@example.com", responseStatus: .accepted)],
            colorHex: "#123456", conference: .init(label: "Join", url: "https://example.com/meet"),
            description: "Notes", kind: "details", location: "Room",
            organizer: .init(displayName: "Host", email: "host@example.com"), title: "Sample")
        let baseline = Event(
            calendarId: source.calendarId, content: .details(details), createdAt: source.createdAt,
            id: source.id, recurrence: source.recurrence, schedule: source.schedule, updatedAt: source.updatedAt)
        var draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: baseline))
        draft.title = "Edited"
        let optimistic = try XCTUnwrap(GridEventDraftMapping.optimisticEvent(from: draft, baseline: baseline))
        guard case .details(let edited) = optimistic.content else { return XCTFail("Expected details") }
        XCTAssertEqual(edited.title, "Edited")
        XCTAssertEqual(edited.attendees, details.attendees)
        XCTAssertEqual(edited.organizer, details.organizer)
        XCTAssertEqual(edited.conference, details.conference)
        XCTAssertEqual(edited.colorHex, details.colorHex)
    }

    private func sampleEvent(attendees: [EventContentDetailsAttendees]) -> Event {
        Event(
            calendarId: CalendarId(rawValue: "cal1"),
            content: .details(
                EventContent_DetailsPayload(
                    attendees: attendees,
                    description: "",
                    kind: "details",
                    title: "Sample"
                )
            ),
            createdAt: DateTime(rawValue: "2026-01-01T00:00:00.000Z"),
            id: EventId(rawValue: "evt1evt1evt1evt1evt1evt1"),
            recurrence: .single(EventRecurrence_SinglePayload(kind: "single")),
            schedule: .timed(
                EventSchedule_TimedPayload(
                    end: DateTime(rawValue: "2026-01-01T01:00:00.000Z"),
                    kind: "timed",
                    start: DateTime(rawValue: "2026-01-01T00:00:00.000Z"),
                    timeZone: IANATimeZone(rawValue: "America/Los_Angeles")
                )
            ),
            updatedAt: DateTime(rawValue: "2026-01-01T00:00:00.000Z")
        )
    }
}
