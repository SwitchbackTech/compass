import XCTest

final class EventFormSaveButtonTests: XCTestCase {
    @MainActor
    func testSaveButtonCommitsEditedTitle() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let title = window.descendants(matching: .any)["compass-event-form-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 8))
        window.typeKey("a", modifierFlags: [.command])
        window.typeText("Saved with button")
        window.buttons["compass-event-form-save"].click()
        XCTAssertTrue(window.buttons["Saved with button"].waitForExistence(timeout: 10))
        XCTAssertFalse(window.buttons["compass-event-form-save"].exists)
    }
}
