import XCTest

final class EventFormLayoutTests: XCTestCase {
    @MainActor
    func testColorSwatchesFitSidebarAndRemainSelectable() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let form = window.descendants(matching: .any)["compass-event-form"]
        XCTAssertTrue(form.waitForExistence(timeout: 8))
        window.typeKey("6", modifierFlags: [.command])
        let colorGrid = form.descendants(matching: .any)["compass-event-form-color"]
        XCTAssertTrue(colorGrid.waitForExistence(timeout: 8))
        for _ in 0 ..< 3 where !colorGrid.buttons["red"].exists {
            form.swipeUp()
        }
        for name in ["Default", "blue", "coral", "gold", "green", "indigo", "lavender",
                     "mint", "orange", "plum", "red", "slate"] {
            let swatch = colorGrid.buttons[name]
            XCTAssertTrue(swatch.waitForExistence(timeout: 2), "Missing color \(name)")
            XCTAssertGreaterThanOrEqual(swatch.frame.minX, form.frame.minX)
            XCTAssertLessThanOrEqual(swatch.frame.maxX, form.frame.maxX)
        }
        let slate = colorGrid.buttons["slate"]
        slate.click()
        XCTAssertEqual(slate.value as? String, "Selected")
    }
}
