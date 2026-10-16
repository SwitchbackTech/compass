import AppKit
import CompassKit
import XCTest
@testable import CompassUI

@MainActor
final class HTMLFragmentAppKitTests: XCTestCase {
    private func roundTrip(_ html: String) -> HTMLFragmentDocument {
        let document = HTMLFragmentDocument.parse(html)
        let attributed = HTMLFragmentAppKit.attributedString(from: document, textColor: .textColor, linkColor: .linkColor)
        return HTMLFragmentAppKit.document(from: attributed)
    }

    func testListsRetainTheirStructure() {
        for html in ["<ul><li>First</li><li>Second</li></ul>",
                     "<ol><li>First</li><li>Second</li></ol>",
                     "<p>Intro</p><ul><li>Item</li></ul><p>After</p>"] {
            XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
        }
    }

    func testRepeatedLinesKeepTheirOwnFormatting() {
        let html = "<p>Same</p><p><b>Same</b></p><p><i>Same</i></p>"
        XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
    }

    func testNestedFormattingAndLinksAreNotDropped() {
        let html = "<p><b><i>Both</i></b> <a href=\"https://example.com\"><b>Link</b></a></p>"
        XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
    }

    func testSoftBreaksAndEmptyParagraphsSurvive() {
        let html = "<p>First<br>Second</p><p></p><p>Last</p><p></p>"
        XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
    }

    func testEmojiDoesNotShiftFormattingRanges() {
        let html = "<p>🌴 Same</p><p><b>🌴 Same</b></p>"
        XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
    }

    func testUnsupportedMultilineHTMLIsPreservedWhileEditingOtherParagraphs() {
        let html = "<table>\n<tr><td>Legacy</td></tr>\n</table><p>Note</p>"
        XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
    }

    func testTextThatLooksLikeAListStaysAParagraph() {
        for html in ["<p>1. Plain text</p>", "<p>• Plain text</p>"] {
            XCTAssertEqual(roundTrip(html), HTMLFragmentDocument.parse(html))
        }
    }
}
