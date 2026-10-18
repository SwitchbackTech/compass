import XCTest

final class SidebarResizeKeyboardTests: XCTestCase {
    @MainActor
    func testDividerOwnsArrowAndResetKeys() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let divider = app.windows["Compass"].descendants(matching: .any)["compass-native-sidebar-resize-handle"]
        XCTAssertTrue(divider.waitForExistence(timeout: 8))
        divider.click()
        divider.typeKey(.return, modifierFlags: [])
        assertWidth(divider, 345)
        divider.typeKey(.leftArrow, modifierFlags: [])
        assertWidth(divider, 361)
        let evidence = XCTAttachment(screenshot: app.windows["Compass"].screenshot())
        evidence.name = "Keyboard-focused sidebar divider"
        evidence.lifetime = .keepAlways
        add(evidence)
        divider.typeKey(.rightArrow, modifierFlags: [])
        assertWidth(divider, 345)
        divider.typeKey(.home, modifierFlags: [])
        assertWidth(divider, 240)
        divider.typeKey(.end, modifierFlags: [])
        assertWidth(divider, 480)
        divider.typeKey(.return, modifierFlags: [])
        assertWidth(divider, 345)
        XCTAssertFalse(app.windows["Compass"].descendants(matching: .any)["compass-event-form"].exists)
    }

    @MainActor
    func testDraggingStillResizesAndDoubleClickResets() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let divider = app.windows["Compass"].descendants(matching: .any)["compass-native-sidebar-resize-handle"]
        XCTAssertTrue(divider.waitForExistence(timeout: 8))
        divider.click()
        divider.typeKey(.return, modifierFlags: [])
        let start = divider.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: -32, dy: 0)))
        assertWidth(divider, 377)
        divider.doubleClick()
        assertWidth(divider, 345)
    }

    @MainActor
    func testKeyboardWidthPersistsAcrossRelaunch() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let divider = app.windows["Compass"].descendants(matching: .any)["compass-native-sidebar-resize-handle"]
        XCTAssertTrue(divider.waitForExistence(timeout: 8))
        divider.click()
        divider.typeKey(.return, modifierFlags: [])
        divider.typeKey(.leftArrow, modifierFlags: [])
        assertWidth(divider, 361)
        app.terminate()
        app.launch()
        XCTAssertTrue(divider.waitForExistence(timeout: 8))
        assertWidth(divider, 361)
        divider.click()
        divider.typeKey(.return, modifierFlags: [])
        assertWidth(divider, 345)
    }

    @MainActor
    private func assertWidth(_ divider: XCUIElement, _ expected: Double, file: StaticString = #file, line: UInt = #line) {
        guard let value = divider.value as? NSNumber else {
            return XCTFail("Expected numeric sidebar width, got \(String(describing: divider.value))", file: file, line: line)
        }
        XCTAssertEqual(value.doubleValue, expected, file: file, line: line)
    }
}
