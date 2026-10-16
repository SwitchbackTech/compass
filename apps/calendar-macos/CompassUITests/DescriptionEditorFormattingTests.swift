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
        defer {
            if (testRun?.failureCount ?? 0) > 0 {
                let hierarchy = XCTAttachment(string: window.debugDescription)
                hierarchy.lifetime = .keepAlways
                add(hierarchy)
                let screenshot = XCTAttachment(screenshot: app.screenshot())
                screenshot.lifetime = .keepAlways
                add(screenshot)
            }
        }
        let editor = window.textViews["compass-event-form-description"]
        XCTAssertTrue(editor.waitForExistence(timeout: 8))
        window.typeKey("9", modifierFlags: [.command])
        editor.click()
        editor.typeKey("a", modifierFlags: [.command])
        editor.typeText("Formatted note")
        XCTAssertEqual(editor.value as? String, "Formatted note")
        editor.typeKey("a", modifierFlags: [.command])
        window.checkBoxes["Bold"].click()
        window.typeKey(.enter, modifierFlags: [.command])
        XCTAssertTrue(editor.waitForNonExistence(timeout: 8))

        window.typeKey(.enter, modifierFlags: [])
        XCTAssertTrue(editor.waitForExistence(timeout: 8))
        window.typeKey("9", modifierFlags: [.command])
        editor.click()
        editor.typeKey("a", modifierFlags: [.command])
        XCTAssertEqual(editor.value as? String, "Formatted note")
        XCTAssertEqual(String(describing: window.checkBoxes["Bold"].value ?? ""), "1")
    }
}
