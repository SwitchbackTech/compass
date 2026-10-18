import XCTest
@testable import CompassKit

final class BookingEventLinksTests: XCTestCase {
    func testParsesPairedBackendAnchorsWithUnicodeNotes() throws {
        let links = try XCTUnwrap(BookingEventLinks.parse("<p>🌴 Looking forward to it</p>" + description()))
        XCTAssertEqual(links.reservationId, "507f1f77bcf86cd799439011")
        XCTAssertEqual(links.token, "test-booking-token")
        XCTAssertEqual(links.rescheduleURL, "https://compass.invalid/meet/reschedule/507f1f77bcf86cd799439011?token=test-booking-token")
    }

    func testRequiresBothActionsAndOneMatchingIdentity() {
        XCTAssertNil(BookingEventLinks.parse("<a href='https://compass.invalid/meet/cancel/id?token=t'>Cancel</a>"))
        XCTAssertNil(BookingEventLinks.parse(description().replacingOccurrences(of: "/reschedule/507f1f77bcf86cd799439011", with: "/reschedule/other")))
        XCTAssertNil(BookingEventLinks.parse(description().replacingOccurrences(of: "reschedule/507f1f77bcf86cd799439011?token=test-booking-token", with: "reschedule/507f1f77bcf86cd799439011?token=other")))
    }

    func testIgnoresNonBookingAndEmptyDescriptions() {
        XCTAssertNil(BookingEventLinks.parse(nil))
        XCTAssertNil(BookingEventLinks.parse("  "))
        XCTAssertNil(BookingEventLinks.parse("<p>Team sync</p>"))
        XCTAssertNil(BookingEventLinks.parse(description().replacingOccurrences(of: "/meet/", with: "/book/")))
    }

    private func description() -> String {
        "<a href='https://compass.invalid/meet/cancel/507f1f77bcf86cd799439011?token=test-booking-token'>Cancel</a> | <a href='https://compass.invalid/meet/reschedule/507f1f77bcf86cd799439011?token=test-booking-token'>Reschedule</a>"
    }
}
