import CompassKit
import XCTest

final class TimeZoneFormattingTests: XCTestCase {
    func testUTCLabelMatchesWeb() throws {
        let at = try XCTUnwrap(
            CompassDateParsing.parseInEffectiveTimeZone("2026-07-15T12:00:00.000Z"))
        XCTAssertEqual(TimeZoneFormatting.abbreviation(for: "UTC", at: at), "UTC")
    }

    func testNamedZoneUsesShortAbbreviation() throws {
        let summer = try XCTUnwrap(
            CompassDateParsing.parseInEffectiveTimeZone("2026-07-15T18:00:00.000Z"))
        XCTAssertEqual(
            TimeZoneFormatting.abbreviation(for: "America/Denver", at: summer),
            "MDT")
    }
}
