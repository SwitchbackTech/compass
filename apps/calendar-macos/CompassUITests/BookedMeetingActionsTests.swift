import AppKit
import XCTest

final class BookedMeetingActionsTests: XCTestCase {
    @MainActor
    func testCancellationShortcutRequiresConfirmationAndEscapeResetsIt() throws {
        let pasteboard = NSPasteboard.general
        let original = (pasteboard.pasteboardItems ?? []).map { item in
            Dictionary(uniqueKeysWithValues: item.types.compactMap { type in
                item.data(forType: type).map { (type.rawValue, $0) }
            })
        }
        addTeardownBlock {
            await MainActor.run {
                let pasteboard = NSPasteboard.general
                pasteboard.clearContents()
                let items = original.map { values in
                    let item = NSPasteboardItem()
                    for (type, data) in values { item.setData(data, forType: .init(type)) }
                    return item
                }
                if !items.isEmpty { pasteboard.writeObjects(items) }
            }
        }
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo", "-COMPASS_APP_URL", "https://compass.invalid",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK", "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let editor = window.textViews["compass-event-form-description"]
        XCTAssertTrue(editor.waitForExistence(timeout: 8))
        window.typeKey("9", modifierFlags: [.command])
        editor.click()
        let link = NSMutableAttributedString(string: "Cancel Reschedule")
        link.addAttribute(.link, value: URL(string: "https://compass.invalid/meet/cancel/reservation-1?token=secret")!, range: NSRange(location: 0, length: 6))
        link.addAttribute(.link, value: URL(string: "https://compass.invalid/meet/reschedule/reservation-1?token=secret")!, range: NSRange(location: 7, length: 10))
        let rtf = try link.data(from: NSRange(location: 0, length: link.length),
            documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])
        pasteboard.clearContents()
        pasteboard.setData(rtf, forType: .rtf)
        pasteboard.setString(link.string, forType: .string)
        editor.typeKey("a", modifierFlags: [.command])
        editor.typeKey("v", modifierFlags: [.command])
        window.typeKey(.return, modifierFlags: [.command])
        XCTAssertTrue(editor.waitForNonExistence(timeout: 8))
        window.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(window.buttons["Cancel meeting"].waitForExistence(timeout: 8))
        XCTAssertTrue(window.buttons["Reschedule"].exists)
        XCTAssertFalse(window.buttons["Delete"].exists)
        window.typeKey("x", modifierFlags: [.command, .shift])
        XCTAssertTrue(window.buttons["Confirm cancel"].waitForExistence(timeout: 8))
        window.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(window.buttons["Cancel meeting"].waitForExistence(timeout: 8))
        XCTAssertTrue(editor.exists)
    }
}
