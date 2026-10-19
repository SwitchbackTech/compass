import CompassKit
import XCTest

final class EventFormDateFormatTests: XCTestCase {
    override func setUp() {
        super.setUp()
        EffectiveTimeZone.identifier = "UTC"
    }

    func testFormatLabelUsesMonthDayYearDots() throws {
        let date = try XCTUnwrap(CompassDateParsing.parseInEffectiveTimeZone("2026-10-17T12:00:00"))
        XCTAssertEqual(EventFormDateFormat.formatLabel(for: date), "10.17.26")
    }
}
