import CompassKit
import XCTest

/// Web `EventColorSlotSchema` order drives swatch positions and pick keys.
final class EventColorSlotOrderTests: XCTestCase {
    func testWebOrderListsEverySlotOnce() {
        XCTAssertEqual(EventColorSlot.webOrder.count, EventColorSlot.allCases.count)
        XCTAssertEqual(Set(EventColorSlot.webOrder), Set(EventColorSlot.allCases))
    }

    func testWebOrderStartsWithLavender() {
        XCTAssertEqual(EventColorSlot.webOrder.first, .lavender)
        XCTAssertEqual(EventColorSlot.webOrder.last, .red)
    }
}
