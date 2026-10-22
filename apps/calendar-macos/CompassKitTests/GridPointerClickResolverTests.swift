import CompassKit
import XCTest

final class GridPointerClickResolverTests: XCTestCase {
    func testTimedSlotSnapsToFifteenMinutes() throws {
        let dateKey = "2026-09-29"
        let timeZone = TimeZone(identifier: "America/Denver")!
        let slot = GridPointerClickResolver.timedSlot(
            atY: 720,
            gridHeight: 1440,
            dateKey: dateKey,
            timeZone: timeZone
        )
        XCTAssertEqual(slot?.timeKey, "1200")
    }
}
