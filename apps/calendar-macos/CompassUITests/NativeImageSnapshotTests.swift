import XCTest

final class NativeImageSnapshotTests: XCTestCase {
    @MainActor
    func testDemoWeekGridSnapshot() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()

        let window = app.windows["Compass"]
        NativeImageSnapshotSupport.captureWindow(window, named: "demo-week-grid")
    }

    @MainActor
    func testLifeViewSnapshot() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()

        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        window.typeKey("l", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-life-grid"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "life-view")
    }

    @MainActor
    func testEventFormSnapshot() {
        let window = launchDemoWindow()
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form")
    }

    @MainActor
    func testCommandPaletteSnapshot() {
        let window = launchDemoWindow()
        window.typeKey("k", modifierFlags: [.command])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-command-palette"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "command-palette")
    }

    @MainActor
    func testShortcutsLegendSnapshot() {
        let window = launchDemoWindow()
        window.typeKey("/", modifierFlags: [.shift])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-shortcuts-legend"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "shortcuts-legend")
    }

    @MainActor
    private func launchDemoWindow() -> XCUIElement {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-COMPASS_FIXTURE", "demo"]
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        return window
    }
}
