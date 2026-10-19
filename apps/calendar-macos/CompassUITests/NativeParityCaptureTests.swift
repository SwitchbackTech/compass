import CompassKit
import XCTest

/// Exports window PNGs for desktop ↔ web visual parity (see
/// `.github/workflows/desktop-web-parity-screenshots.yml`). Run with
/// `PARITY_CAPTURE=1` and `PARITY_OUTPUT_DIR` set; skips ReferenceImages diff.
final class NativeParityCaptureTests: XCTestCase {
    private static let demoLaunchArgs = ["-COMPASS_FIXTURE", "demo", "-compass.theme", "light-beach"]

    @MainActor
    func testExportParitySurfaces() throws {
        guard NativeImageSnapshotSupport.parityCapture else {
            throw XCTSkip("Set PARITY_CAPTURE=1 to export parity PNGs")
        }

        captureWeekGrid()
        captureMiniCalendar()
        captureEventForm()
        captureCommandPalette()
        captureSettings()
        captureWelcomeOnboarding()
    }

    @MainActor
    private func captureWeekGrid() {
        let window = launchDemoWindow()
        NativeImageSnapshotSupport.captureWindow(window, named: "week-grid")
    }

    @MainActor
    private func captureMiniCalendar() {
        let window = launchDemoWindow()
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-month-picker"].waitForExistence(timeout: 10))
        window.typeKey("i", modifierFlags: [])
        NativeImageSnapshotSupport.captureWindow(window, named: "mini-calendar")
    }

    @MainActor
    private func captureEventForm() {
        let window = launchDemoWindow()
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form")
    }

    @MainActor
    private func captureCommandPalette() {
        let window = launchDemoWindow()
        window.typeKey("k", modifierFlags: [.command])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-command-palette"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "command-palette")
    }

    @MainActor
    private func captureSettings() {
        let window = launchDemoWindow()
        window.typeKey(",", modifierFlags: [.command])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-settings"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "settings")
    }

    @MainActor
    private func captureWelcomeOnboarding() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += ["-\(OnboardingStorageKeys.hasSeenWelcome)", "false", "-compass.theme", "light-beach"]
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-welcome-modal"].waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "onboarding-welcome")
    }

    @MainActor
    private func launchDemoWindow() -> XCUIElement {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += Self.demoLaunchArgs
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        return window
    }
}
