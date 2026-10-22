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
    private func requireParityCapture() throws {
        guard NativeImageSnapshotSupport.parityCapture else {
            throw XCTSkip("Set PARITY_CAPTURE=1 to export parity PNGs")
        }
    }

    @MainActor
    func testExportParitySurface_onboardingWelcome() throws {
        try requireParityCapture()
        captureWelcomeOnboarding()
    }

    @MainActor
    func testExportParitySurface_weekGrid() throws {
        try requireParityCapture()
        captureWeekGrid()
    }

    @MainActor
    func testExportParitySurface_weekGridAllDay() throws {
        try requireParityCapture()
        captureWeekGridAllDay()
    }

    @MainActor
    func testExportParitySurface_demoEventsBanner() throws {
        try requireParityCapture()
        captureDemoEventsBanner()
    }

    @MainActor
    func testExportParitySurface_modHoldOverlay() throws {
        try requireParityCapture()
        captureModHoldOverlay()
    }

    @MainActor
    func testExportParitySurface_upNextBanner() throws {
        try requireParityCapture()
        captureUpNextBanner()
    }

    @MainActor
    func testExportParitySurface_miniCalendar() throws {
        try requireParityCapture()
        captureMiniCalendar()
    }

    @MainActor
    func testExportParitySurface_eventForm() throws {
        try requireParityCapture()
        captureEventForm()
    }

    @MainActor
    func testExportParitySurface_eventFormDatePicker() throws {
        try requireParityCapture()
        captureEventFormDatePicker()
    }

    @MainActor
    func testExportParitySurface_eventFormTimePicker() throws {
        try requireParityCapture()
        captureEventFormTimePicker()
    }

    @MainActor
    func testExportParitySurface_eventFormMeetingLink() throws {
        try requireParityCapture()
        captureEventFormMeetingLink()
    }

    @MainActor
    func testExportParitySurface_commandPalette() throws {
        try requireParityCapture()
        captureCommandPalette()
    }

    @MainActor
    func testExportParitySurface_settings() throws {
        try requireParityCapture()
        captureSettings()
    }

    @MainActor
    private func captureWeekGrid() {
        let window = launchDemoWindow().window
        prepareParityGrid(window, dismissDemoBanner: true)
        let headerTitle = window.buttons["compass-native-header-title"]
        XCTAssertTrue(headerTitle.waitForExistence(timeout: 10))
        XCTAssertTrue(
            headerTitle.label.contains("2026"),
            "Title bar reference should use demo parity calendar date, got: \(headerTitle.label)")
        NativeImageSnapshotSupport.exportMacTitleBarReference(window)
        NativeImageSnapshotSupport.captureWindow(window, named: "week-grid")
    }

    @MainActor
    private func captureWeekGridAllDay() {
        let window = launchDemoWindow().window
        prepareParityGrid(window, dismissDemoBanner: true)
        let allDay = window.descendants(matching: .any)["compass-grid-allday"]
        XCTAssertTrue(allDay.waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "week-grid-allday")
    }

    @MainActor
    private func captureDemoEventsBanner() {
        let window = launchDemoWindow().window
        prepareParityGrid(window, dismissDemoBanner: false)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-demo-events-banner"].waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "demo-events-banner")
    }

    @MainActor
    private func captureModHoldOverlay() {
        let window = launchDemoWindow(extraLaunchArgs: ["-COMPASS_UI_TEST_SHOW_PAGE_JUMP_HINTS"]).window
        prepareParityGrid(window, dismissDemoBanner: true, pageJumpHintsPinned: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-mod-hold-chips"].waitForExistence(timeout: 10))
        NativeImageSnapshotSupport.captureWindow(window, named: "mod-hold-overlay")
    }

    @MainActor
    private func captureUpNextBanner() {
        let window = launchDemoWindow().window
        prepareParityGrid(window, dismissDemoBanner: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-up-next-banner"].waitForExistence(timeout: 15))
        NativeImageSnapshotSupport.captureWindow(window, named: "up-next-banner")
    }

    @MainActor
    private func captureMiniCalendar() {
        let window = launchDemoWindow().window
        prepareParityGrid(window, dismissDemoBanner: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-native-month-picker"].waitForExistence(timeout: 10))
        window.typeKey("i", modifierFlags: [])
        NativeImageSnapshotSupport.captureWindow(window, named: "mini-calendar")
    }

    @MainActor
    private func captureEventForm() {
        let window = launchDemoWindow().window
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form")
    }

    @MainActor
    private func captureEventFormDatePicker() {
        let window = launchDemoWindow(extraLaunchArgs: ["-COMPASS_UI_TEST_OPEN_EVENT_FORM_DATE_PICKER"]).window
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("c", modifierFlags: [])
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form-date-picker"].waitForExistence(timeout: 12))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form-date-picker")
    }

    @MainActor
    private func captureEventFormTimePicker() {
        let window = launchDemoWindow(extraLaunchArgs: ["-COMPASS_UI_TEST_OPEN_EVENT_FORM_TIME_PICKER"]).window
        prepareParityGrid(window, dismissDemoBanner: true)
        window.typeKey("c", modifierFlags: [])
        let startTimeMenu = window.descendants(matching: .any)["compass-event-form-start-menu"]
        XCTAssertTrue(startTimeMenu.waitForExistence(timeout: 12))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form-time-picker")
    }

    @MainActor
    private func captureEventFormMeetingLink() {
        let window = launchDemoWindow(extraLaunchArgs: [
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]).window
        prepareParityGrid(window, dismissDemoBanner: true)
        XCTAssertTrue(
            window.descendants(matching: .any)["compass-event-form-conference"].waitForExistence(timeout: 8))
        NativeImageSnapshotSupport.captureWindow(window, named: "event-form-meeting-link")
    }

    @MainActor
    private func captureCommandPalette() {
        let launch = launchDemoWindow()
        prepareParityGridForCommandPalette(launch.window)
        let palette = launch.window.descendants(matching: .any)["compass-native-command-palette"]
        let search = launch.window.textFields["compass-native-command-palette-search"]
        launch.window.typeKey("k", modifierFlags: [.command])
        XCTAssertTrue(
            palette.waitForExistence(timeout: 15),
            "Expected command palette after keyboard or View menu shortcut")
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        NativeImageSnapshotSupport.captureWindow(launch.window, named: "command-palette")
    }

    /// Full `prepareParityGrid` (today jump, scroll-hint dismiss, long settle) breaks palette open in CI.
    @MainActor
    private func prepareParityGridForCommandPalette(_ window: XCUIElement) {
        let okay = window.buttons["Okay"]
        if okay.waitForExistence(timeout: 4) {
            okay.tap()
            let banner = window.descendants(matching: .any)["compass-native-demo-events-banner"]
            let dismissDeadline = Date().addingTimeInterval(5)
            while Date() < dismissDeadline, banner.exists {
                RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            }
        }
        XCTAssertTrue(
            waitForGridColumnCount(window, atLeast: 5, timeout: 20),
            "Expected five day columns before command palette capture")
        XCTAssertTrue(
            window.buttons["Morning standup"].waitForExistence(timeout: 20),
            "Expected demo-seed timed event on the week grid")
    }

    @MainActor
    private func captureSettings() {
        let window = launchDemoWindow().window
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
            "-\(OnboardingStorageKeys.hasSeenWelcome)", "false",
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
        window.buttons["Get started for free"].click()
        window.buttons["Next"].click()
        XCTAssertTrue(
            window.buttons["Start free trial with Google"].waitForExistence(timeout: 8))
        sleep(1)
        NativeImageSnapshotSupport.captureWindow(window, named: "onboarding-welcome-account-choice")
    }

    @MainActor
    private func launchDemoWindow(extraLaunchArgs: [String] = []) -> (app: XCUIApplication, window: XCUIElement) {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += Self.demoLaunchArgs + extraLaunchArgs
        app.launchEnvironment["PARITY_CAPTURE"] = "1"
        if let outDir = NativeImageSnapshotSupport.parityOutputDirectory {
            app.launchEnvironment["PARITY_OUTPUT_DIR"] = outDir
        }
        app.launch()
        let window = app.windows["Compass"]
        XCTAssertTrue(window.waitForExistence(timeout: 15))
        return (app, window)
    }

    /// Dismiss demo chrome and wait for the shared demo-seed grid event (web parity uses the same fixture).
    @MainActor
    private func prepareParityGrid(
        _ window: XCUIElement,
        dismissDemoBanner: Bool,
        pageJumpHintsPinned: Bool = false
    ) {
        let okay = window.buttons["Okay"]
        if dismissDemoBanner, okay.waitForExistence(timeout: 4) {
            okay.tap()
            let banner = window.descendants(matching: .any)["compass-native-demo-events-banner"]
            let dismissDeadline = Date().addingTimeInterval(5)
            while Date() < dismissDeadline, banner.exists {
                RunLoop.current.run(until: Date().addingTimeInterval(0.1))
            }
        }
        if pageJumpHintsPinned {
            XCTAssertTrue(
                window.descendants(matching: .any)["compass-mod-hold-chips"].waitForExistence(timeout: 20),
                "Expected page-jump chip overlay while hints are pinned")
            let wednesdayColumn = window.descendants(matching: .any)["compass-grid-column-2026-06-10"]
            XCTAssertTrue(
                wednesdayColumn.waitForExistence(timeout: 20),
                "Expected Wednesday demo week column while page-jump hints are pinned")
        } else {
            let wednesdayHeader = window.staticTexts.matching(
                NSPredicate(format: "label ENDSWITH[c] %@", " Wed")
            ).firstMatch
            XCTAssertTrue(
                wednesdayHeader.waitForExistence(timeout: 20),
                "Expected Wednesday column in parity week grid")
        }
        XCTAssertTrue(
            waitForGridColumnCount(window, atLeast: 5, timeout: 20),
            "Expected five day columns in parity week grid")
        window.typeKey("t", modifierFlags: [])
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.6))
        // Re-run today/scroll after the timed viewport height settles (viewport-based hourHeight).
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
        XCTAssertTrue(
            window.buttons["Lunch with Sam"].waitForExistence(timeout: 20),
            "Expected Tuesday Lunch with Sam demo event after scroll-to-now parity setup")
        XCTAssertTrue(
            window.buttons["Exercise"].waitForExistence(timeout: 20),
            "Expected Wednesday Exercise demo event after scroll-to-now parity setup")
        let dismissScrollHint = window.buttons["Dismiss"]
        if dismissScrollHint.waitForExistence(timeout: 2) {
            dismissScrollHint.tap()
        }
        sleep(2)
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
