import XCTest

final class SettingsKeyboardIsolationTests: XCTestCase {
    @MainActor
    func testBackdropAndEscapeCloseSettingsInBothThemes() {
        for theme in ["light-beach", "dark-abyss"] {
            let app = XCUIApplication.compassUITest()
            app.launchArguments += ["-COMPASS_FIXTURE", "demo", "-compass.theme", theme]
            app.launch()
            let window = app.windows["Compass"]
            XCTAssertTrue(window.waitForExistence(timeout: 15))
            window.typeKey(",", modifierFlags: [.command])
            let settings = window.descendants(matching: .any)["compass-native-settings"]
            XCTAssertTrue(settings.waitForExistence(timeout: 8))
            let evidence = XCTAttachment(screenshot: window.screenshot())
            evidence.name = "Settings modal backdrop, \(theme)"
            evidence.lifetime = .keepAlways
            add(evidence)
            window.coordinate(withNormalizedOffset: .zero)
                .withOffset(CGVector(dx: 20, dy: 200))
                .click()
            XCTAssertTrue(settings.waitForNonExistence(timeout: 5))
            window.typeKey(",", modifierFlags: [.command])
            XCTAssertTrue(settings.waitForExistence(timeout: 8))
            window.typeKey(.escape, modifierFlags: [])
            XCTAssertTrue(settings.waitForNonExistence(timeout: 5))
            app.terminate()
        }
    }

    @MainActor
    func testSettingsDoesNotCreateAnEventBehindTheDialog() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        window.typeKey(",", modifierFlags: .command)
        let settings = window.descendants(matching: .any)["compass-native-settings"]
        XCTAssertTrue(settings.waitForExistence(timeout: 5))
        window.typeKey("c", modifierFlags: [])
        window.typeKey(.escape, modifierFlags: [])
        XCTAssertFalse(settings.exists)
        XCTAssertFalse(window.descendants(matching: .any)["compass-event-form"].exists)
        XCTAssertFalse(window.buttons["Untitled event"].exists)
        XCTAssertTrue(window.staticTexts["Morning standup"].exists)
    }

    @MainActor
    func testExportSavePanelOwnsTypingAndCanBeCancelled() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        window.typeKey(",", modifierFlags: .command)
        let export = window.buttons["Export data"]
        XCTAssertTrue(export.waitForExistence(timeout: 5))
        export.click()
        let sheet = window.sheets.firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 5))
        let filename = sheet.textFields.firstMatch
        XCTAssertTrue(filename.exists)
        filename.click()
        filename.typeKey("a", modifierFlags: .command)
        filename.typeText("calendar-backup.json")
        sheet.buttons["Cancel"].click()
        XCTAssertFalse(sheet.exists)
        window.typeKey(.escape, modifierFlags: [])
        XCTAssertFalse(window.descendants(matching: .any)["compass-event-form"].exists)
        XCTAssertFalse(window.buttons["Untitled event"].exists)
    }
}
