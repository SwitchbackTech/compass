import XCTest
@testable import CompassKit

final class AccountChoiceCopyTests: XCTestCase {
    func testAccountChoiceCopyMatchesWeb() {
        XCTAssertEqual(AccountChoiceCopy.localDeviceOnlyLabel, "On this device only")
        XCTAssertEqual(
            AccountChoiceCopy.localDeviceOnlySubtitle,
            "Events stay in this browser until you connect an account.")
        XCTAssertEqual(
            AccountChoiceCopy.connectCalendarAccountLabel,
            "Connect a calendar account")
        XCTAssertEqual(
            AccountChoiceCopy.connectCalendarAccountHelper,
            "Pick Google, Microsoft, or Apple. Or keep using this device only from the calendar list.")
    }
}
