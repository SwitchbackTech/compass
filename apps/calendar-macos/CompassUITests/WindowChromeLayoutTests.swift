import XCTest

final class WindowChromeLayoutTests: XCTestCase {
    @MainActor
    func testHeaderUsesTopChromeWithoutAnEmptyToolbarBand() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo", "-COMPASS_APP_URL", "https://compass.invalid"]
        app.launch()
        let window = app.windows["Compass"]
        let title = window.buttons["compass-native-header-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        XCTAssertLessThan(title.frame.midY - window.frame.minY, 60,
            "The calendar header belongs in the top chrome, not below an empty toolbar")
        let previous = window.buttons["Previous"]
        XCTAssertLessThan(previous.frame.minX - window.frame.minX, 96,
            "Previous week control should sit in the unified title bar beside traffic lights")
        let sidebarToggle = window.buttons.matching(
            NSPredicate(format: "label IN %@", ["Open sidebar", "Close sidebar"])
        ).firstMatch
        XCTAssertTrue(sidebarToggle.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(
            sidebarToggle.frame.minX - window.frame.minX,
            window.frame.width * 0.72,
            "Sidebar toggle should align with the web header on the right")
        let evidence = XCTAttachment(screenshot: window.screenshot())
        evidence.name = "Calendar styling and top chrome"
        evidence.lifetime = .keepAlways
        add(evidence)
        title.click()
        XCTAssertTrue(window.buttons["Day, D"].waitForExistence(timeout: 5))
    }
}
