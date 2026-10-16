import AppKit
import CompassKit
import SwiftUI
import XCTest
@testable import CompassUI

@MainActor
final class DescriptionEditorTests: XCTestCase {
    func testFormattingImmediatelyUpdatesBoundHTMLWithoutTyping() {
        var html = "<p>Selected</p>"
        let coordinator = DescriptionEditorView.Coordinator(html: Binding(get: { html }, set: { html = $0 }))
        let editor = DescriptionTextView()
        coordinator.textView = editor
        editor.delegate = coordinator
        coordinator.load(html: html, resetKey: "event")
        editor.setSelectedRange(NSRange(location: 0, length: 8))

        editor.toggleFontTrait(.boldFontMask)
        XCTAssertEqual(html, "<p><strong>Selected</strong></p>")
        editor.toggleFontTrait(.italicFontMask)
        XCTAssertEqual(html, "<p><strong><em>Selected</em></strong></p>")
        editor.applyLink(URL(string: "https://example.com")!, to: editor.selectedRange())
        XCTAssertEqual(html, "<p><a href=\"https://example.com\"><strong><em>Selected</em></strong></a></p>")
    }

    func testCaretFormattingSurvivesThemeUpdates() {
        let coordinator = DescriptionEditorView.Coordinator(html: .constant(""))
        let editor = DescriptionTextView()
        coordinator.textView = editor
        editor.toggleFontTrait(.boldFontMask)
        coordinator.applyTheme(.darkAbyss)
        let font = editor.typingAttributes[.font] as? NSFont
        XCTAssertTrue(font.map { NSFontManager.shared.traits(of: $0).contains(.boldFontMask) } ?? false)
        editor.toggleFontTrait(.boldFontMask)
        XCTAssertFalse(NSFontManager.shared.traits(of: editor.typingAttributes[.font] as! NSFont).contains(.boldFontMask))
    }

    func testListButtonsPreserveInlineFormattingAndToggleBackToParagraphs() {
        var html = "<p><strong>🌴 First</strong></p><p>Second</p>"
        let coordinator = DescriptionEditorView.Coordinator(html: Binding(get: { html }, set: { html = $0 }))
        let editor = DescriptionTextView()
        coordinator.textView = editor
        editor.delegate = coordinator
        coordinator.load(html: html, resetKey: "event")
        editor.setSelectedRange(NSRange(location: 0, length: (editor.string as NSString).length))

        editor.toggleList(ordered: false)
        XCTAssertEqual(html, "<ul><li><p><strong>🌴 First</strong></p></li><li><p>Second</p></li></ul>")
        editor.toggleList(ordered: true)
        XCTAssertEqual(html, "<ol><li><p><strong>🌴 First</strong></p></li><li><p>Second</p></li></ol>")
        editor.toggleList(ordered: true)
        XCTAssertEqual(html, "<p><strong>🌴 First</strong></p><p>Second</p>")
    }

    func testEmptyParagraphCanBecomeAListWithoutMovingCaretIntoPrefix() {
        let editor = DescriptionTextView()
        editor.setSelectedRange(NSRange(location: 0, length: 0))
        editor.toggleList(ordered: false)
        XCTAssertEqual(editor.string, "• ")
        XCTAssertEqual(editor.selectedRange(), NSRange(location: 2, length: 0))
        editor.toggleList(ordered: false)
        XCTAssertEqual(editor.string, "")
        XCTAssertEqual(editor.selectedRange(), NSRange(location: 0, length: 0))
    }

    func testReadOnlyEditorRejectsFormatting() {
        let editor = DescriptionTextView()
        editor.textStorage?.setAttributedString(NSAttributedString(string: "Read only"))
        editor.setSelectedRange(NSRange(location: 0, length: 9))
        editor.isEditable = false
        editor.toggleFontTrait(.boldFontMask)
        editor.applyLink(URL(string: "https://example.com")!, to: editor.selectedRange())
        XCTAssertNil(editor.textStorage?.attribute(.link, at: 0, effectiveRange: nil))
        XCTAssertNil(editor.textStorage?.attribute(.font, at: 0, effectiveRange: nil))
    }
}
