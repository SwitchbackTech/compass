import CompassKit
import XCTest

final class DayJumpPrefixesTests: XCTestCase {
    func testMondayPrefix() {
        XCTAssertEqual(DayJumpPrefixes.prefix(forWeekday: 1), "m")
        XCTAssertEqual(DayJumpPrefixes.dayPrefix(forShiftedLetter: "M"), "m")
    }
}
