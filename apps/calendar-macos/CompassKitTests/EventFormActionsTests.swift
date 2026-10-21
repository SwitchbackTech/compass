import XCTest
@testable import CompassKit

final class EventFormActionsTests: XCTestCase {
    func testOmitsCopyMeetingLinkWithoutURL() throws {
        let registry = try ShortcutRegistry()
        let without = EventFormActions.list(
            registry: registry,
            options: .init(
                hasMeetingLink: false,
                isExistingEvent: true,
                isReadOnly: false,
                showBookingFormActions: false))
        XCTAssertFalse(without.map(\.id).contains("edit-copy-meeting-link"))
    }

    func testIncludesCopyMeetingLinkWhenPresent() throws {
        let registry = try ShortcutRegistry()
        let withLink = EventFormActions.list(
            registry: registry,
            options: .init(
                hasMeetingLink: true,
                isExistingEvent: true,
                isReadOnly: false,
                showBookingFormActions: false))
        XCTAssertTrue(withLink.map(\.id).contains("edit-copy-meeting-link"))
    }
}
