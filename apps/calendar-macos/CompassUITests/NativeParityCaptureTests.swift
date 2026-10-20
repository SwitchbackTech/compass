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
        "-\(OnboardingStorageKeys.pointerHintDismissedPermanently)", "true",
    ]

    @MainActor
    func testExportParitySurfaces() throws {
        guard NativeImageSnapshotSupport.parityCapture else {
            throw XCTSkip("Set PARITY_CAPTURE=1 to export parity PNGs")
        }

        captureWelcomeOnboarding()
        captureWeekGrid()
        captureWeekGridAllDay()
        captureDemoEventsBanner()
        captureModHoldOverlay()
        captureUpNextBanner()
        captureMiniCalendar()
        captureEventForm()
        captureEventFormDatePicker()
        captureEventFormTimePicker()
        captureCommandPalette()
        captureSettings()
    }

    @MainActor
    private func captureWeekGrid() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        NativeImageSnapshotSupport.captureWindow(window, named: "week-grid")
    }

    @MainActor
    private func captureWeekGridAllDay() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        let allDay = window.descendants(matching: .any)["compass-grid-allday"]
        XCTAssertTrue(allDay.waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "week-grid-allday")
    }

    @MainActor
    private func captureDemoEventsBanner() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: false)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-demo-events-banner"].waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "demo-events-banner")
    }

    @MainActor
    private func captureModHoldOverlay() {
        let window = launchDemoWindow(extraLaunchArgs: ["-COMPASS_UI_TEST_SHOW_PAGE_JUMP_HINTS"])
        prepareParityGrid(window, dismissDemoBanner: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-mod-hold-chips"].waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "mod-hold-overlay")
    }

    @MainActor
    private func captureUpNextBanner() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-up-next-banner"].waitForExistence(timeout: 15))
        NativeImageSnapshotSupport.captureWindow(window, named: "up-next-banner")
    }

    @MainActor
    private func captureMiniCalendar() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-month-picker"].waitForExistence(timeout: 10))
        window.typeKey("i", modifierFlags: [])
        NativeImageSnapshotSupport.captureWindow(window, named: "mini-calendar")
    }

    @MainActor
    private func captureEventForm() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form")
    }

    @MainActor
    private func captureEventFormDatePicker() {
        let window = launchDemoWindow(extraLaunchArgs: ["-COMPASS_UI_TEST_OPEN_EVENT_FORM_DATE_PICKER"])
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form-date-picker"].waitForExistence(timeout: 12))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form-date-picker")
    }

    @MainActor
    private func captureEventFormTimePicker() {
        let window = launchDemoWindow(extraLaunchArgs: ["-COMPASS_UI_TEST_OPEN_EVENT_FORM_TIME_PICKER"])
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("c", modifierFlags: [])
        let startTimeMenu = window.descendants(matching: .any)["compass-event-form-start-menu"]
        XCTAssertTrue(startTimeMenu.waitForExistence(timeout: 12))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form-time-picker")
    }

    @MainActor
    private func captureCommandPalette() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("k", modifierFlags: [.command])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-command-palette"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "command-palette")
    }

    @MainActor
    private func captureSettings() {
        let window = launchDemoWindow()
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey(",", modifierFlags: [.command])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-settings"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "settings")
    }

    @MainActor
    private func captureWelcomeOnboarding() {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-\(OnboardingStorageKeys.hasSeenWelcome)", "false",
            "-\(OnboardingStorageKeys.pointerHintDismissedPermanently)", "true",
            "-compass.theme", "light-beach",
            "-COMPASS_UI_TEST_PARITY_CAPTURE",
            "-PARITY_CAPTURE",
        ]
        app.launchEnvironment["PARITY_CAPTURE"] = "1"
        if let outDir = NativeImageSnapshotSupport.parityOutputDirectory {
            app.launchEnvironment["PARITY_OUTPUT_DIR"] = outDir
        }
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-welcome-modal"].waitForExistence(timeout: 15))
        sleep(1)
        NativeImageSnapshotSupport.captureWindow(window, named: "onboarding-welcome")
    }

    @MainActor
    private func launchDemoWindow(extraLaunchArgs: [String] = []) -> XCUIElement {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += Self.demoLaunchArgs + extraLaunchArgs
        app.launchEnvironment["PARITY_CAPTURE"] = "1"
        if let outDir = NativeImageSnapshotSupport.parityOutputDirectory {
            app.launchEnvironment["PARITY_OUTPUT_DIR"] = outDir
        }
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        return window
    }

    /// Dismiss demo chrome and wait for the shared demo-seed grid event (web parity uses the same fixture).
    @MainActor
    private func prepareParityGrid(_ window: XCUIElement, dismissDemoBanner: Bool) {
        let okay = window.buttons["Okay"]
        if dismissDemoBanner, okay.waitForExistence(timeout: 4) {
            okay.tap()
            let banner = window.descendants(matching: .any)["compass-native-demo-events-banner"]
            let dismissDeadline = Date().addingTimeInterval(5)
            while Date() < dismissDeadline, banner.exists {
                RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            }
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
        window.typeKey("t", modifierFlags: [])
        let sundayColumn = window.descendants(matching: .any)["compass-grid-column-2026-06-07"]
        XCTAssertTrue(
            sundayColumn.waitForExistence(timeout: 20),
            "Expected Sunday demo week column (2026-06-07) after nav today")
        XCTAssertTrue(sundayColumn.isHittable, "Expected Sunday column visible, not scrolled off-screen")
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
        let dismissScrollHint = window.buttons["Dismiss"]
        if dismissScrollHint.waitForExistence(timeout: 2) {
            dismissScrollHint.tap()
        }
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
