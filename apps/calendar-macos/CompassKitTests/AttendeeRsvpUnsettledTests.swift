import CompassKit
import XCTest

final class AttendeeRsvpUnsettledTests: XCTestCase {
    private func guest(_ email: String, _ status: ResponseStatusEnum) -> EventContentDetailsAttendees {
        EventContentDetailsAttendees(displayName: nil, email: email, responseStatus: status)
    }

    func testAwaitingOrTentativeGuestsOfAnOrganizedEventAreUnsettled() {
        XCTAssertTrue(AttendeeRsvp.hasUnsettledGuests(
            organizerEmail: "me@example.com",
            attendees: [guest("me@example.com", .accepted), guest("b@example.com", .needsAction)],
            calendarAccountEmail: "me@example.com"))
        XCTAssertTrue(AttendeeRsvp.hasUnsettledGuests(
            organizerEmail: nil,
            attendees: [guest("b@example.com", .tentative)],
            calendarAccountEmail: "me@example.com"))
    }

    func testSettledGuestsInvitesFromOthersAndUnknownAccountsAreNot() {
        XCTAssertFalse(AttendeeRsvp.hasUnsettledGuests(
            organizerEmail: "me@example.com",
            attendees: [guest("b@example.com", .accepted), guest("c@example.com", .declined)],
            calendarAccountEmail: "me@example.com"))
        XCTAssertFalse(AttendeeRsvp.hasUnsettledGuests(
            organizerEmail: "boss@example.com",
            attendees: [guest("me@example.com", .needsAction)],
            calendarAccountEmail: "me@example.com"))
        XCTAssertFalse(AttendeeRsvp.hasUnsettledGuests(
            organizerEmail: nil,
            attendees: [guest("b@example.com", .needsAction)],
            calendarAccountEmail: nil))
    }
}
