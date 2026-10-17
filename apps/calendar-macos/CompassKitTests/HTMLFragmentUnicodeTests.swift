import CompassKit
import XCTest

final class HTMLFragmentUnicodeTests: XCTestCase {
    func testStructuredBlockRangesUseUTF16Offsets() {
        for text in ["🌴", "👨‍👩‍👧‍👦", "e\u{301}", "日本語"] {
            let html = "<p>\(text)</p><p><strong>Again \(text)</strong></p>"
            XCTAssertEqual(HTMLFragmentDocument.roundTrip(html), html)
        }
    }

    func testUnicodeAroundUnsupportedBlocksRetainsEveryBlock() {
        let html = "🌴<p>First 🌊</p><section>👨‍👩‍👧‍👦</section><p>Last</p>🏖"
        XCTAssertEqual(HTMLFragmentDocument.roundTrip(html), html)
    }
}
