import AppKit
import CompassKit
import XCTest
@testable import CompassUI

@MainActor
final class TimeGridNowCueTests: XCTestCase {
    func testVisibleNowLinePulsesWhenScrollingBackToTarget() throws {
        let state = TimeGridState(layoutMode: .day,
            scenario: GridLayoutScenario(calendars: GridLayoutSnapshotFixtures.parityCalendars,
                layoutMode: .day, referenceNow: GridLayoutSnapshotFixtures.referenceNow,
                visibleDateKeys: ["2026-05-20"]))
        let view = TimeGridView(state: state, theme: .lightBeach)
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 600)
        view.layoutSubtreeIfNeeded()
        var pulses = 0
        view.onNowCuePulse = { pulses += 1 }
        view.applyScroll(.scrollToNowOrPulse)
        XCTAssertEqual(pulses, 0, "An offscreen now line should scroll into view without a pulse")
        let scroll = try XCTUnwrap(scrollView(in: view))
        let target = scroll.contentView.bounds.origin.y
        view.applyScroll(.hourUp)
        XCTAssertLessThan(scroll.contentView.bounds.origin.y, target)
        let nowLine = try XCTUnwrap(state.snapshot(colWidths: state.resolvedColumnWidths()).nowLine)
        XCTAssertGreaterThanOrEqual(nowLine.top, scroll.contentView.bounds.minY)
        XCTAssertLessThanOrEqual(nowLine.top, scroll.contentView.bounds.maxY)
        view.applyScroll(.scrollToNowOrPulse)
        XCTAssertEqual(scroll.contentView.bounds.origin.y, target, accuracy: 0.1)
        XCTAssertEqual(pulses, 1, "A visible now line should pulse even when a scroll is also needed")
        view.applyScroll(.scrollToNowOrPulse)
        XCTAssertEqual(pulses, 2, "Repeated today requests should retrigger the cue")
    }

    private func scrollView(in view: NSView) -> NSScrollView? {
        if let scroll = view as? NSScrollView { return scroll }
        return view.subviews.compactMap { scrollView(in: $0) }.first
    }
}
