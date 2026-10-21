import XCTest

final class EventJumpDayPrefixUITests: XCTestCase {
    @MainActor
    func testLowercaseDayPrefixChipFocusesEvent() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 8))
        window.click()
        window.typeText("f")
        let chips = window.otherElements["compass-event-jump-chips"]
        XCTAssertTrue(chips.waitForExistence(timeout: 8))
        let chipLabels = window.staticTexts.matching(identifier: "compass-event-jump-chip")
        XCTAssertGreaterThan(chipLabels.count, 0)
        let label = chipLabels.element(boundBy: 0).label
        XCTAssertFalse(label.isEmpty)
        XCTAssertEqual(label, label.lowercased())
        window.typeText(label)
        let probe = window.descendants(matching: .any)["compass-grid-event-focused"]
        XCTAssertTrue(probe.waitForExistence(timeout: 8))
        let evidence = XCTAttachment(screenshot: window.screenshot())
        evidence.name = "Day-prefix event jump chips"
        evidence.lifetime = .keepAlways
        add(evidence)
    }
}
