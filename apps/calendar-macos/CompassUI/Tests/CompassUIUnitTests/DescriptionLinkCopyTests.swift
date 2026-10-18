import AppKit
import XCTest
@testable import CompassUI

@MainActor
final class DescriptionLinkCopyTests: XCTestCase {
    func testCaretLinkWinsOverTheFirstLinkAndDoesNotChangeTheDescription() {
        let editor = makeEditor()
        editor.setSelectedRange((editor.string as NSString).range(of: "Second"))
        let selection = editor.selectedRange()
        let before = editor.attributedString()
        let pasteboard = NSPasteboard.withUniqueName()
        defer { pasteboard.releaseGlobally() }
        var copied = 0
        editor.onLinkCopied = { copied += 1 }
        XCTAssertTrue(editor.copyDescriptionLink(to: pasteboard))
        XCTAssertEqual(pasteboard.string(forType: .string), "https://example.com/second")
        XCTAssertEqual(copied, 1)
        XCTAssertEqual(editor.selectedRange(), selection)
        XCTAssertEqual(editor.attributedString(), before)
    }

    func testCaretOutsideLinksFallsBackToTheFirstLinkInReadOnlyDescriptions() {
        let editor = makeEditor()
        editor.isEditable = false
        editor.setSelectedRange(NSRange(location: 0, length: 0))
        let pasteboard = NSPasteboard.withUniqueName()
        defer { pasteboard.releaseGlobally() }
        XCTAssertTrue(editor.copyDescriptionLink(to: pasteboard))
        XCTAssertEqual(pasteboard.string(forType: .string), "https://example.com/first")
    }

    func testDescriptionWithoutLinksLeavesTheClipboardAndFeedbackAlone() {
        let editor = DescriptionTextView()
        editor.string = "No links here"
        let pasteboard = NSPasteboard.withUniqueName()
        defer { pasteboard.releaseGlobally() }
        pasteboard.setString("Keep this clipboard", forType: .string)
        var copied = false
        editor.onLinkCopied = { copied = true }
        XCTAssertFalse(editor.copyDescriptionLink(to: pasteboard))
        XCTAssertEqual(pasteboard.string(forType: .string), "Keep this clipboard")
        XCTAssertFalse(copied)
    }

    private func makeEditor() -> DescriptionTextView {
        let editor = DescriptionTextView()
        let text = NSMutableAttributedString(string: "🌴 First Second")
        let string = text.string as NSString
        text.addAttribute(.link, value: URL(string: "https://example.com/first")!, range: string.range(of: "First"))
        text.addAttribute(.link, value: "https://example.com/second", range: string.range(of: "Second"))
        editor.textStorage?.setAttributedString(text)
        return editor
    }
}
