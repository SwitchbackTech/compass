import CompassKit
import XCTest

final class LifeQuotesAndDateFormatTests: XCTestCase {
    private var savedZone = "UTC"

    override func setUp() {
        savedZone = EffectiveTimeZone.identifier
        EffectiveTimeZone.identifier = "America/Denver"
    }

    override func tearDown() {
        EffectiveTimeZone.identifier = savedZone
    }

    func testQuoteListMatchesWebAndEveryQuoteIsAttributed() {
        XCTAssertEqual(LifeQuotes.all.count, 50)
        XCTAssertTrue(LifeQuotes.all.contains("“Lost time is never found again.” (Benjamin Franklin)"))
        XCTAssertTrue(LifeQuotes.all.allSatisfy { $0.hasPrefix("“") && $0.hasSuffix(")") })
        XCTAssertTrue(LifeQuotes.all.contains(LifeQuotes.random()))
    }

    func testDisplayUsesWebsMonthDayYear() {
        XCTAssertEqual(LifeDateFormat.display("2026-06-10"), "Jun 10, 2026")
        XCTAssertEqual(LifeDateFormat.display("1999-12-01"), "Dec 1, 1999")
        XCTAssertEqual(LifeDateFormat.display(""), "")
    }

    func testTypedDatesAcceptBothFormats() {
        XCTAssertEqual(LifeDateFormat.storedValue(from: "Jun 10, 2026"), "2026-06-10")
        XCTAssertEqual(LifeDateFormat.storedValue(from: "jun 10 2026"), "2026-06-10")
        XCTAssertEqual(LifeDateFormat.storedValue(from: "1990-02-03"), "1990-02-03")
        XCTAssertNil(LifeDateFormat.storedValue(from: "Feb 31, 2026"))
        XCTAssertNil(LifeDateFormat.storedValue(from: "someday"))
    }
}
