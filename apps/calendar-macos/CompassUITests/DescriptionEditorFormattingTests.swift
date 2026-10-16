import XCTest

final class DescriptionEditorFormattingTests: XCTestCase {
    @MainActor
    func testBoldSelectionSurvivesSaveAndReopenWithoutExtraTyping() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let editor = window.textViews["compass-event-form-description"]
        XCTAssertTrue(editor.waitForExistence(timeout: 8))
        editor.click()
        editor.typeKey("a", modifierFlags: [.command])
        editor.typeText("Formatted note")
        editor.typeKey("a", modifierFlags: [.command])
        window.buttons["Bold"].click()
        window.typeKey(.enter, modifierFlags: [.command])
        XCTAssertFalse(editor.exists)

        window.typeKey(.enter, modifierFlags: [])
        XCTAssertTrue(editor.waitForExistence(timeout: 8))
        editor.click()
        editor.typeKey("a", modifierFlags: [.command])
        XCTAssertEqual(editor.value as? String, "Formatted note")
        XCTAssertEqual(window.buttons["Bold"].value as? String, "1")
    }
}
