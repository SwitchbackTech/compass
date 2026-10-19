import AppKit
import CompassKit
import XCTest
@testable import CompassUI

@MainActor
final class TimeGridStyleTests: XCTestCase {
    func testGridUsesThemeBorderOpacityAndKeepsHourGutterClear() throws {
        for (theme, alpha) in [(NativeWebTheme.lightBeach, 0.15), (.darkAbyss, 0.12)] {
            let view = makeGrid(theme: theme)
            let descendants = descendants(view)
            let rules = descendants.filter { ($0.frame.height == 1 && $0.frame.width > 100)
                || ($0.frame.width == 1 && $0.frame.height > 100) }
            XCTAssertFalse(rules.isEmpty)
            for rule in rules {
                XCTAssertEqual(try XCTUnwrap(rule.layer?.backgroundColor).alpha, alpha, accuracy: 0.001)
            }
            let hour = try XCTUnwrap(descendants.compactMap { $0 as? NSTextField }.first { $0.stringValue == "1 AM" })
            XCTAssertEqual(hour.font?.pointSize, 10)
            XCTAssertEqual(hour.alignment, .center)
            let gutter = try XCTUnwrap(hour.superview)
            XCTAssertFalse(gutter.subviews.contains { $0.frame.height == 1 }, "Web hour rules start after the label gutter")
        }
    }

    func testIdleTodayColumnDoesNotReceiveFocusTint() throws {
        let view = makeGrid(theme: .lightBeach)
        let fills = descendants(view).filter { $0.frame.height > 100 && $0.frame.width > 100 }
            .compactMap { $0.layer?.backgroundColor }
        XCTAssertFalse(fills.contains { abs($0.alpha - 0.1) < 0.001 }, "Today is not a focused column")
        XCTAssertTrue(fills.contains { NSColor(cgColor: $0)?.isEqual(ThemeTokens.lightBeach.surface.nsColor) == true },
            "Past columns keep their surface tone")
    }

    private func makeGrid(theme: NativeWebTheme) -> TimeGridView {
        let reference = GridLayoutSnapshotFixtures.referenceNow
        let calendar = EffectiveTimeZone.calendar
        let yesterday = calendar.date(byAdding: .day, value: -1, to: reference)!
        let state = TimeGridState(referenceNow: reference,
            scenario: GridLayoutScenario(layoutMode: .week, referenceNow: reference,
                visibleDateKeys: [yesterday, reference].map(CompassDateParsing.formatCalendarDay)))
        let view = TimeGridView(state: state, theme: theme)
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 600)
        view.layoutSubtreeIfNeeded()
        return view
    }

    private func descendants(_ view: NSView) -> [NSView] {
        view.subviews.flatMap { [$0] + descendants($0) }
    }
}
