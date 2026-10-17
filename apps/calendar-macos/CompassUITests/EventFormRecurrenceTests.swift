import XCTest

final class EventFormRecurrenceTests: XCTestCase {
    @MainActor
    func testRecurrenceEndDateCanBeEnabledAndRemoved() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let repeatToggle = window.descendants(matching: .any)["compass-event-form-recurrence-toggle"]
        XCTAssertTrue(repeatToggle.waitForExistence(timeout: 8))
        window.typeKey("4", modifierFlags: [.command])
        repeatToggle.click()
        let frequency = window.descendants(matching: .any)["compass-event-form-recurrence-frequency"]
        XCTAssertEqual(frequency.value as? String, "Daily")
        frequency.click()
        app.menuItems["Yearly"].click()
        XCTAssertEqual(frequency.value as? String, "Yearly")
        frequency.click()
        app.menuItems["Weekly"].click()
        let tuesday = window.buttons["Tuesday"]
        XCTAssertTrue(tuesday.exists)
        XCTAssertTrue(window.buttons["Thursday"].exists)
        let selected = tuesday.value as? String == "Selected"
        tuesday.click()
        XCTAssertEqual(tuesday.value as? String, selected ? "Not selected" : "Selected")
        let endToggle = window.descendants(matching: .any)["compass-event-form-recurrence-has-until"]
        XCTAssertTrue(endToggle.exists)
        let endDate = window.descendants(matching: .any)["compass-event-form-recurrence-until"]
        XCTAssertFalse(endDate.exists)
        endToggle.click()
        XCTAssertTrue(endDate.exists)
        endToggle.click()
        XCTAssertFalse(endDate.exists)
    }
}
