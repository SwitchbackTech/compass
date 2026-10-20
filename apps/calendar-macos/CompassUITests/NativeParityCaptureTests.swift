import CompassKit
import XCTest

/// Exports window PNGs for desktop ↔ web visual parity (see
/// `.github/workflows/desktop-web-parity-screenshots.yml`). Run with
/// `PARITY_CAPTURE=1` and `PARITY_OUTPUT_DIR` set; skips ReferenceImages diff.
final class NativeParityCaptureTests: XCTestCase {
    private static let demoLaunchArgs = [
        "-COMPASS_FIXTURE", "demo",
        "-compass.theme", "light-beach",
        "-COMPASS_UI_TEST_PARITY_CAPTURE",
        "-PARITY_CAPTURE",
        "-\(OnboardingStorageKeys.hasSeenWelcome)", "true",
    ]

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
        prepareParityGrid(window)
        NativeImageSnapshotSupport.captureWindow(window, named: "week-grid")
    }

    @MainActor
    private func captureMiniCalendar() {
        let window = launchDemoWindow()
        prepareParityGrid(window)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-month-picker"].waitForExistence(timeout: 10))
        window.typeKey("i", modifierFlags: [])
        NativeImageSnapshotSupport.captureWindow(window, named: "mini-calendar")
    }

    @MainActor
    private func captureEventForm() {
        let window = launchDemoWindow()
        prepareParityGrid(window)
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form")
    }

    @MainActor
    private func captureCommandPalette() {
        let window = launchDemoWindow()
        prepareParityGrid(window)
        window.typeKey("k", modifierFlags: [.command])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-command-palette"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "command-palette")
    }

    @MainActor
    private func captureSettings() {
        let window = launchDemoWindow()
        prepareParityGrid(window)
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
        app.launchEnvironment["PARITY_CAPTURE"] = "1"
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        return window
    }

    /// Dismiss demo chrome and wait for the shared demo-seed grid event (web parity uses the same fixture).
    @MainActor
    private func prepareParityGrid(_ window: XCUIElement) {
        let okay = window.buttons["Okay"]
        if okay.waitForExistence(timeout: 4) {
            okay.tap()
        }
        let wednesdayHeader = window.staticTexts.matching(
            NSPredicate(format: "label ENDSWITH[c] %@", " Wed")
        ).firstMatch
        XCTAssertTrue(
            wednesdayHeader.waitForExistence(timeout: 20),
            "Expected Wednesday column in parity week grid")
        XCTAssertTrue(
            waitForGridColumnCount(window, atLeast: 5, timeout: 20),
            "Expected five day columns in parity week grid")
        let timedGrid = window.descendants(matching: .any)["compass-grid-timed"]
        if timedGrid.waitForExistence(timeout: 5) {
            timedGrid.click()
        }
        window.typeKey("t", modifierFlags: [])
        let sundayColumn = window.descendants(matching: .any)["compass-grid-column-2026-06-07"]
        XCTAssertTrue(
            sundayColumn.waitForExistence(timeout: 20),
            "Expected Sunday demo week column (2026-06-07) after nav today")
        let timezoneHeader = window.descendants(matching: .any)["compass-grid-timezone-effective"]
        XCTAssertTrue(
            timezoneHeader.waitForExistence(timeout: 10),
            "Expected UTC timezone header on parity week grid")
        XCTAssertTrue(
            timezoneHeader.label.contains("UTC"),
            "Expected effective timezone label to include UTC, got: \(timezoneHeader.label)")
        XCTAssertTrue(
            window.buttons["Morning standup"].waitForExistence(timeout: 20),
            "Expected demo-seed timed event on the week grid")
        sleep(1)
    }

    @MainActor
    private func waitForGridColumnCount(
        _ window: XCUIElement,
        atLeast count: Int,
        timeout: TimeInterval
    ) -> Bool {
        let columns = window.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH %@", "compass-grid-column-")
        )
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if columns.count >= count { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        }
        return columns.count >= count
    }
}
