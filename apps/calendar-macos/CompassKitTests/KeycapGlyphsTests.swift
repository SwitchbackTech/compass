import XCTest
@testable import CompassKit

final class KeycapGlyphsTests: XCTestCase {
    func testModifiersGlueToTheKey() {
        XCTAssertEqual(KeycapGlyphs.display(["Mod", "Shift", ","]), "⌘⇧,")
        XCTAssertEqual(KeycapGlyphs.display(["Alt", "ArrowUp"]), "⌥↑")
        XCTAssertEqual(KeycapGlyphs.display(["Shift", "j"]), "⇧J")
    }

    func testSequencesAndArrowsStaySeparated() {
        XCTAssertEqual(
            KeycapGlyphs.display(["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"]),
            "← ↑ ↓ →")
        XCTAssertEqual(KeycapGlyphs.display(["E", "T"]), "E T")
    }

    func testHotKeyString() {
        XCTAssertEqual(KeycapGlyphs.displayHotKey("Ctrl+Option+Cmd+Space"), "⌃⌥⌘Space")
    }
}
