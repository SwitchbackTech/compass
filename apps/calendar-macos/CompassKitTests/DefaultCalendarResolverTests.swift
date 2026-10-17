import XCTest
@testable import CompassKit

final class DefaultCalendarResolverTests: XCTestCase {
    func testEventWriterDoesNotNeedCalendarManagementPermission() {
        let calendar = CompassCalendar(
            access: .writer, backgroundColor: "#123456",
            capabilities: .init(canInviteAttendees: true, canManage: false,
                canReadAvailability: true, canReadDetails: true, canWatchEvents: true,
                canWrite: true, conferenceKinds: []),
            description: "", foregroundColor: "#FFFFFF", id: "shared", isActive: true,
            isPrimary: false, isVisible: true, name: "Shared", provider: "example", timeZone: nil)
        XCTAssertEqual(DefaultCalendarResolver.writableCalendars(
            [calendar], hasConnectedAccount: true), [calendar])
        XCTAssertEqual(DefaultCalendarResolver.resolvedDefault(
            calendars: [calendar], storedId: calendar.id, hasConnectedAccount: true), calendar)
    }
}
