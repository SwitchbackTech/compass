import XCTest

final class AnonymousCalendarRowTests: XCTestCase {
    @MainActor
    func testLocalCalendarExplainsSyncAndOpensSignupWithoutHidingEvents() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        let row = window.buttons["Start your free trial to save this calendar"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        let standup = window.buttons["Morning standup"]
        XCTAssertTrue(standup.exists)

        row.click()
        XCTAssertTrue(standup.exists)
        app.buttons["Start free trial"].click()
        let authModal = window.descendants(matching: .any)["compass-native-auth-modal"]
        XCTAssertTrue(authModal.waitForExistence(timeout: 8))
        window.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(authModal.waitForNonExistence(timeout: 8))
        XCTAssertTrue(window.buttons["Morning standup"].waitForExistence(timeout: 8))
    }
}
