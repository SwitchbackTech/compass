import XCTest

final class CommandPaletteKeyboardTests: XCTestCase {
    @MainActor
    func testArrowSelectionCreatesTheSelectedAllDayEvent() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        window.typeKey("k", modifierFlags: [.command])
        let search = window.textFields["compass-native-command-palette-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 8))
        search.typeText("create")
        let timed = window.buttons["compass-native-palette-item-create-event"]
        let allDay = window.buttons["compass-native-palette-item-create-allday-event"]
        XCTAssertTrue(timed.exists)
        for _ in 0..<24 {
            if timed.value as? String == "Selected" { break }
            window.typeKey(.downArrow, modifierFlags: [])
        }
        XCTAssertEqual(timed.value as? String, "Selected")
        window.typeKey(.downArrow, modifierFlags: [])
        XCTAssertEqual(allDay.value as? String, "Selected")
        let evidence = XCTAttachment(screenshot: window.screenshot())
        evidence.name = "Command palette keyboard selection"
        evidence.lifetime = .keepAlways
        add(evidence)
        window.typeKey(.return, modifierFlags: [])
        XCTAssertFalse(search.exists)
        let title = window.textFields["compass-event-form-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 8))
        let toggle = window.descendants(matching: .any)["compass-event-form-allday"]
        XCTAssertEqual(toggle.value as? String, "1")
    }

    @MainActor
    func testFileNewEventOpensTheNativeForm() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.staticTexts["Morning standup"].waitForExistence(timeout: 8))
        app.menuBars.menuBarItems["File"].click()
        app.menuItems["New Event"].click()
        XCTAssertTrue(app.windows["Compass"].textFields["compass-event-form-title"].waitForExistence(timeout: 8))
    }
}
