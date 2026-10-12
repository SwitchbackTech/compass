import CompassKit
import XCTest

final class LocationSuggestionTextTests: XCTestCase {
    func testJoinsTitleAndSubtitle() {
        XCTAssertEqual(
            LocationSuggestionText.text(title: "Apple Park", subtitle: "1 Apple Park Way, Cupertino, CA"),
            "Apple Park, 1 Apple Park Way, Cupertino, CA"
        )
    }

    func testUsesTitleAloneWhenSubtitleIsBlank() {
        XCTAssertEqual(LocationSuggestionText.text(title: "Cupertino, CA", subtitle: "  "), "Cupertino, CA")
    }

    func testSearchesOnlyFromThreeCharacters() {
        XCTAssertFalse(LocationSuggestionText.shouldSearch(" 16 "))
        XCTAssertTrue(LocationSuggestionText.shouldSearch("160"))
    }
}
