import Foundation
import XCTest
@testable import CompassKit

final class CivilDayGridTests: XCTestCase {
    func testSpringForwardNowLineAndScrollFollowCivilHourSlots() throws {
        try assertNowLine(instant: "2026-03-08T09:30:00Z", day: "2026-03-08", minutes: 150)
    }

    func testFallBackNowLineAndScrollFollowCivilHourSlots() throws {
        try assertNowLine(instant: "2026-11-01T09:30:00Z", day: "2026-11-01", minutes: 210)
    }

    func testRepeatedHourOccupiesSeparateCivilSlots() throws {
        try assertNowLine(instant: "2026-11-01T07:30:00Z", day: "2026-11-01", minutes: 90)
        try assertNowLine(instant: "2026-11-01T08:30:00Z", day: "2026-11-01", minutes: 150)
    }

    func testCivilDayRowsAndLabelsFollowTheVisibleDay() throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        EffectiveTimeZone.identifier = "America/Denver"
        let reference = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-18T15:00:00Z"))
        for (day, hours, repeatedOnes) in [("2026-03-08", 23.0, 1), ("2026-11-01", 25.0, 2)] {
            let state = TimeGridState(referenceNow: reference,
                scenario: GridLayoutScenario(layoutMode: .week, referenceNow: reference, visibleDateKeys: [day]),
                effectiveTimeZone: "America/Denver")
            XCTAssertEqual(CompassDateParsing.formatCalendarDay(state.hourLabelDate), day)
            XCTAssertEqual(state.civilDayHours, hours)
            let labels = MappedHourLabels.labels(effectiveTimeZone: "America/Denver",
                displayTimeZone: "America/Denver", at: state.hourLabelDate)
            XCTAssertEqual(labels.count, Int(hours) - 1)
            XCTAssertEqual(labels.filter { $0 == "1 AM" }.count, repeatedOnes)
            let secondary = MappedHourLabels.labels(effectiveTimeZone: "America/Denver",
                displayTimeZone: "Asia/Kolkata", at: state.hourLabelDate)
            XCTAssertEqual(secondary.count, labels.count)
        }
    }

    private func assertNowLine(instant: String, day: String, minutes: Double) throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        EffectiveTimeZone.identifier = "America/Denver"
        let date = try XCTUnwrap(ISO8601DateFormatter().date(from: instant))
        let snapshot = GridLayoutSnapshotBuilder.build(
            scenario: GridLayoutScenario(layoutMode: .week, referenceNow: date, visibleDateKeys: [day]),
            colWidths: [300])
        let line = try XCTUnwrap(snapshot.nowLine)
        let expectedTop = minutes / 60 * snapshot.metrics.hourHeight
        XCTAssertEqual(GridScrollMath.minutesFromStartOfDay(referenceNow: date), minutes, accuracy: 0.001)
        XCTAssertEqual(line.top, expectedTop, accuracy: 0.001)
        XCTAssertEqual(GridScrollMath.scrollToNowDocumentY(referenceNow: date,
            hourHeight: snapshot.metrics.hourHeight, allDayOffset: 0),
            max(0, expectedTop - GridScrollMath.scrollToNowBufferPx), accuracy: 0.001)
    }
}
