import XCTest
@testable import CompassKit

final class SystemCalendarConnectCopyTests: XCTestCase {
    func testDeniedMessageMentionsSystemSettings() {
        XCTAssertTrue(
            SystemCalendarConnectCopy.deniedMessage.contains("System Settings"))
    }
}
