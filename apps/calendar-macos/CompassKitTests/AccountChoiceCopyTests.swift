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
        XCTAssertEqual(
            AccountChoiceCopy.welcomeTrialCardTermsLine(),
            "7-day free trial. Card required, no charge until it ends.")
        XCTAssertEqual(
            AccountChoiceCopy.signupTrialStepTermsLine,
            "Card required. No charge until the trial ends.")
    }
}
