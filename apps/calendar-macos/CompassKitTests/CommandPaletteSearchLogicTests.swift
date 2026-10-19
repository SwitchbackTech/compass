import CompassKit
import XCTest

final class CommandPaletteSearchLogicTests: XCTestCase {
    func testScoreRequiresEveryToken() {
        let item = CommandPaletteSearchLogic.CommandPaletteSearchItem(
            id: "today",
            label: "Go to Today",
            keywords: ["now"])
        XCTAssertGreaterThan(CommandPaletteSearchLogic.scoreCommandItem(item: item, query: "go today"), 0)
        XCTAssertEqual(CommandPaletteSearchLogic.scoreCommandItem(item: item, query: "go mars"), 0)
    }

    func testLabelMatchRangesMergeAdjacent() {
        let ranges = CommandPaletteSearchLogic.labelMatchRanges(label: "Go to Day", query: "go day")
        XCTAssertEqual(ranges.map { ($0.lowerBound, $0.upperBound) }, [(0, 2), (6, 9)])
    }

    func testKeywordOnlyMatchDoesNotHighlightLabel() {
        let ranges = CommandPaletteSearchLogic.labelMatchRanges(
            label: "Play Block Party",
            query: "game")
        XCTAssertTrue(ranges.isEmpty)
    }
}
