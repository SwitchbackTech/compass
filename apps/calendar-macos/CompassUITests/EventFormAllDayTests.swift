import XCTest

final class EventFormAllDayTests: XCTestCase {
    @MainActor
    func testAllDayFormExposesBothDateControls() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let toggle = window.descendants(matching: .any)["compass-event-form-allday"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 8))
        toggle.click()
        XCTAssertTrue(window.descendants(matching: .any)["compass-event-form-start"].exists)
        XCTAssertTrue(window.descendants(matching: .any)["compass-event-form-end"].exists)
    }
}
