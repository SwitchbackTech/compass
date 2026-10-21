import AppKit
import XCTest

final class EventFormMeetingLinkCopyShortcutTests: XCTestCase {
    @MainActor
    func testMeetingLinkRowShowsKeycapsAndShortcutCopiesURL() {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        defer { pasteboard.clearContents() }

        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK", "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let conference = window.descendants(matching: .any)["compass-event-form-conference"]
        XCTAssertTrue(conference.waitForExistence(timeout: 8))
        XCTAssertTrue(window.staticTexts["Google Meet"].exists)

        let copyControl = window.buttons["compass-event-form-meeting-link-copy"]
        XCTAssertTrue(copyControl.waitForExistence(timeout: 8))

        let title = window.textFields["compass-event-form-title"]
        XCTAssertTrue(title.exists)
        title.click()
        pasteboard.clearContents()
        window.typeKey("l", modifierFlags: [.command, .shift])
        XCTAssertTrue(window.staticTexts["Link copied"].waitForExistence(timeout: 8))
        XCTAssertEqual(pasteboard.string(forType: .string), "https://meet.google.com/abc-defg-hij")
    }
}
