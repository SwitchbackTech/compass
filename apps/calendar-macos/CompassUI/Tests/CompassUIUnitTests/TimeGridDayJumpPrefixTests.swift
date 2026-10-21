import AppKit
import CompassKit
import XCTest
@testable import CompassUI

/// Web `DayLabels`: while Mod is held the weekday name becomes a ⇧SU / ⇧M
/// keycap, and event-jump mode shows the bare letter.
@MainActor
final class TimeGridDayJumpPrefixTests: XCTestCase {
    private let dayKeys = ["2026-05-17", "2026-05-18"]

    func testWeekHeadersShowWeekdayNamesByDefault() {
        let view = render(showDayJumpPrefixes: false)
        XCTAssertEqual(headerTexts(in: view, dayKey: "2026-05-17"), ["17 Sun"])
    }

    func testWeekHeadersShowShiftPrefixedChipsWhileModIsHeld() {
        let view = render(showDayJumpPrefixes: true)
        XCTAssertTrue(headerTexts(in: view, dayKey: "2026-05-17").contains("⇧SU"))
        XCTAssertTrue(headerTexts(in: view, dayKey: "2026-05-18").contains("⇧M"))
        XCTAssertFalse(headerTexts(in: view, dayKey: "2026-05-17").contains("Sun"))
    }

    func testEventJumpModeShowsBarePrefixes() {
        let view = render(showDayJumpPrefixes: true, dayJumpUseShiftPrefix: false)
        XCTAssertTrue(headerTexts(in: view, dayKey: "2026-05-17").contains("SU"))
    }

    private func render(showDayJumpPrefixes: Bool, dayJumpUseShiftPrefix: Bool = true) -> TimeGridView {
        let state = TimeGridState(
            layoutMode: .week,
            scenario: GridLayoutSnapshotFixtures.parityScenario(layoutMode: .week, visibleDateKeys: dayKeys),
            showDayJumpPrefixes: showDayJumpPrefixes,
            dayJumpUseShiftPrefix: dayJumpUseShiftPrefix
        )
        let view = TimeGridView(state: state, theme: .lightBeach)
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 600)
        view.layoutSubtreeIfNeeded()
        return view
    }

    private func headerTexts(in view: NSView, dayKey: String) -> [String] {
        guard let header = firstView(in: view, identifier: dayKey) else { return [] }
        return ([header] + allSubviews(of: header)).compactMap { subview in
            guard let field = subview as? NSTextField, !field.isHidden else { return nil }
            return field.stringValue
        }
    }

    private func firstView(in view: NSView, identifier: String) -> NSView? {
        if view.identifier?.rawValue == identifier { return view }
        return view.subviews.compactMap { firstView(in: $0, identifier: identifier) }.first
    }

    private func allSubviews(of view: NSView) -> [NSView] {
        view.subviews + view.subviews.flatMap { allSubviews(of: $0) }
    }
}
