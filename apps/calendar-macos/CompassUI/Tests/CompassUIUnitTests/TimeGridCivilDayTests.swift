import AppKit
import CompassKit
import XCTest
@testable import CompassUI

@MainActor
final class TimeGridCivilDayTests: XCTestCase {
    func testGridUsesVisibleCivilDayForHeightAndHourLabels() throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        EffectiveTimeZone.identifier = "America/Denver"
        let reference = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-18T15:00:00Z"))
        for (day, hours, repeatedOnes) in [("2026-03-08", 23.0, 1), ("2026-11-01", 25.0, 2)] {
            let state = TimeGridState(layoutMode: .day, referenceNow: reference,
                scenario: GridLayoutScenario(layoutMode: .day, referenceNow: reference, visibleDateKeys: [day]),
                effectiveTimeZone: "America/Denver")
            let view = TimeGridView(state: state, theme: .lightBeach)
            view.frame = NSRect(x: 0, y: 0, width: 800, height: 600)
            view.layoutSubtreeIfNeeded()
            let scroll = try XCTUnwrap(descendants(view).compactMap { $0 as? NSScrollView }.first)
            let document = try XCTUnwrap(scroll.documentView)
            let metrics = state.snapshot(colWidths: state.resolvedColumnWidths()).metrics
            XCTAssertEqual(document.frame.height, hours * metrics.hourHeight + GridTimeConstants.gridPaddingBottom, accuracy: 0.1)
            let labels = descendants(view).compactMap { ($0 as? NSTextField)?.stringValue }
            XCTAssertEqual(labels.filter { $0 == "1 AM" }.count, repeatedOnes)
            XCTAssertTrue(labels.contains("11 PM"))
            if hours == 23 { XCTAssertFalse(labels.contains("2 AM")) }
        }
    }

    /// Web #4686: the 5 PM label sits at the top of the 5 PM slot, where a
    /// 5 PM event starts (1 AM track origin), not two hours lower.
    func testHourLabelsShareTheEventTrackOrigin() throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        EffectiveTimeZone.identifier = "UTC"
        let state = TimeGridState(layoutMode: .day,
            scenario: GridLayoutScenario(layoutMode: .day,
                referenceNow: GridLayoutSnapshotFixtures.referenceNow, visibleDateKeys: ["2026-05-20"]),
            effectiveTimeZone: "UTC")
        let view = TimeGridView(state: state, theme: .lightBeach)
        view.frame = NSRect(x: 0, y: 0, width: 800, height: 600)
        view.layoutSubtreeIfNeeded()
        let document = try XCTUnwrap(descendants(view).compactMap { $0 as? NSScrollView }.first?.documentView)
        let hourHeight = (document.frame.height - GridTimeConstants.gridPaddingBottom) / state.civilDayHours
        let label = try XCTUnwrap(descendants(view).compactMap { $0 as? NSTextField }.first { $0.stringValue == "5 PM" })
        let eventTop = GridTimeConstants.timedGridTopPx(minutesFromCivilMidnight: 17 * 60, hourHeight: hourHeight)
        XCTAssertEqual(label.frame.minY, eventTop, accuracy: 3, "5 PM label at \(label.frame.minY), 5 PM event top at \(eventTop)")
    }

    private func descendants(_ view: NSView) -> [NSView] {
        view.subviews.flatMap { [$0] + descendants($0) }
    }
}
