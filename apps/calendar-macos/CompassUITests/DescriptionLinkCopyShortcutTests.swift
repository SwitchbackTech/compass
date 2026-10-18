import AppKit
import XCTest

final class DescriptionLinkCopyShortcutTests: XCTestCase {
    @MainActor
    func testExportedShortcutCopiesAPastedDescriptionLink() throws {
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
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK", "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let editor = window.textViews["compass-event-form-description"]
        XCTAssertTrue(editor.waitForExistence(timeout: 8))
        window.typeKey("9", modifierFlags: [.command])
        editor.click()
        let link = NSAttributedString(string: "Copy this link",
            attributes: [.link: URL(string: "https://example.com/copied-description-link")!])
        let rtf = try link.data(from: NSRange(location: 0, length: link.length),
            documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])
        pasteboard.clearContents()
        pasteboard.setData(rtf, forType: .rtf)
        pasteboard.setString(link.string, forType: .string)
        editor.typeKey("a", modifierFlags: [.command])
        editor.typeKey("v", modifierFlags: [.command])
        XCTAssertEqual(editor.value as? String, "Copy this link")
        pasteboard.clearContents()
        pasteboard.setString("Before copying the URL", forType: .string)
        editor.typeKey("c", modifierFlags: [.command, .shift])
        XCTAssertTrue(window.staticTexts["Link copied"].waitForExistence(timeout: 8))
        XCTAssertEqual(pasteboard.string(forType: .string), "https://example.com/copied-description-link")
        XCTAssertEqual(editor.value as? String, "Copy this link")
    }
}
