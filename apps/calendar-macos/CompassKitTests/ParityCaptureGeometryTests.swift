import CompassKit
import XCTest

final class ParityCaptureGeometryTests: XCTestCase {
    func testContentTrackWidthMatchesWebBootShell() {
        // index.html: track = innerWidth - 32 - (32 + sidebarWidth)
        XCTAssertEqual(ParityCaptureGeometry.contentTrackWidth, 871, accuracy: 0.1)
        XCTAssertEqual(ParityCaptureGeometry.visibleDayCount, 5)
    }

    func testWeekViewStartMatchesWebSundayWeek() throws {
        EffectiveTimeZone.identifier = "UTC"
        let reference = try XCTUnwrap(
            CompassDateParsing.parseInEffectiveTimeZone("2026-06-10T15:00:00.000Z"))
        let weekStart = ParityCaptureGeometry.weekViewStart(containing: reference)
        XCTAssertEqual(CompassDateParsing.formatCalendarDay(weekStart), "2026-06-07")
    }
}
