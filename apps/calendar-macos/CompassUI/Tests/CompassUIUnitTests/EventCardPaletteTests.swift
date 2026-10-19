import AppKit
import CompassKit
import XCTest
@testable import CompassUI

@MainActor
final class EventCardPaletteTests: XCTestCase {
    func testCalendarColorStaysInAccentAndFocusWhileDefaultFillFollowsTheme() throws {
        let scenario = GridLayoutSnapshotFixtures.parityScenario(layoutMode: .week, visibleDateKeys: ["2026-05-20"])
        for (theme, hex) in [(NativeWebTheme.lightBeach, "#454442"), (.darkAbyss, "#82A0B2")] {
            let view = try cardView(scenario: scenario, theme: theme)
            assertColor(view.layer?.backgroundColor, hex: hex)
            let accent = try XCTUnwrap(view.layer?.sublayers?.first { $0.frame.width == 3 })
            XCTAssertFalse(accent.isHidden)
            assertColor(accent.backgroundColor, hex: "#3b82f6")
            let ring = try XCTUnwrap(view.layer?.sublayers?.first { $0.borderWidth == 2 })
            assertColor(ring.borderColor, hex: "#3b82f6")
        }
    }

    func testExplicitEventColorDoesNotReplaceCalendarAccent() throws {
        var scenario = GridLayoutSnapshotFixtures.parityScenario(layoutMode: .week, visibleDateKeys: ["2026-05-20"])
        scenario.timedEvents[0].colorHex = "#8e24aa"
        let view = try cardView(scenario: scenario, theme: .lightBeach)
        assertColor(view.layer?.backgroundColor, hex: "#8e24aa")
        let accent = try XCTUnwrap(view.layer?.sublayers?.first { $0.frame.width == 3 })
        assertColor(accent.backgroundColor, hex: "#3b82f6")
    }

    func testSingleCalendarDoesNotPaintAnIdentityStrip() throws {
        var scenario = GridLayoutSnapshotFixtures.parityScenario(layoutMode: .week, visibleDateKeys: ["2026-05-20"])
        scenario.calendars = [scenario.calendars[0]]
        let view = try cardView(scenario: scenario, theme: .lightBeach)
        let accent = try XCTUnwrap(view.layer?.sublayers?.first { $0.frame.width == 3 })
        XCTAssertTrue(accent.isHidden)
    }

    func testHiddenOpacityAppliesToTheWholeCard() throws {
        let scenario = GridLayoutSnapshotFixtures.parityScenario(layoutMode: .week, visibleDateKeys: ["2026-05-20"])
        let view = try cardView(scenario: scenario, theme: .lightBeach, eventId: "hidden-strip")
        XCTAssertEqual(view.layer?.opacity, 0.6)
        assertColor(view.layer?.backgroundColor, hex: "#454442")
    }

    private func cardView(scenario: GridLayoutScenario, theme: NativeWebTheme, eventId: String = "overlap-a") throws -> EventCardView {
        let snapshot = GridLayoutSnapshotBuilder.build(scenario: scenario, colWidths: [400])
        let card = try XCTUnwrap(snapshot.cards.first { $0.eventId == eventId })
        let view = EventCardView(frame: .zero)
        view.apply(card: card, theme: theme, isFocused: true)
        return view
    }

    private func assertColor(_ color: CGColor?, hex: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(color.flatMap { NSColor(cgColor: $0)?.usingColorSpace(.deviceRGB) },
            EventCardColorParser.nsColor(hex: hex)?.usingColorSpace(.deviceRGB), file: file, line: line)
    }
}
