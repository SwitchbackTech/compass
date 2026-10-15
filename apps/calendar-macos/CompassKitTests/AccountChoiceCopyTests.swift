import XCTest
@testable import CompassKit

final class AccountChoiceCopyTests: XCTestCase {
    func testAccountChoiceCopyUsesDesktopWording() {
        XCTAssertEqual(AccountChoiceCopy.localDeviceOnlyLabel, "On this device only")
        XCTAssertEqual(
            AccountChoiceCopy.localDeviceOnlySubtitle,
            "Events stay on this Mac until you connect an account.")
        XCTAssertEqual(
            AccountChoiceCopy.connectCalendarAccountLabel,
            "Connect a calendar account")
        XCTAssertEqual(
            AccountChoiceCopy.connectCalendarAccountHelper,
            "Pick a provider below. Or keep using this device only from the calendar list.")
    }
}
