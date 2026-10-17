import CompassKit
import XCTest

final class RecurrenceRuleLineEditingTests: XCTestCase {
    func testTimedUntilSerializesAsValidUTCAndExpandsThroughFinalDay() throws {
        let start = try instant("2026-03-07T17:00:00.000Z")
        let end = start.addingTimeInterval(3600)
        let until = try instant("2026-03-10T05:59:59.000Z")
        let line = try XCTUnwrap(RecurrenceRuleLine.buildLine(pattern: .init(frequency: .daily, until: until),
            scheduleStart: start, scheduleEnd: end, timeZoneIdentifier: "America/Denver", isAllDay: false))
        XCTAssertEqual(line, "RRULE:FREQ=DAILY;UNTIL=20260310T055959Z")
        let rule = try XCTUnwrap(RecurrenceRule(startDateISO: "2026-03-07T17:00:00.000Z", endDateISO: "2026-03-07T18:00:00.000Z",
            recurrenceRule: line, timeZoneIdentifier: "America/Denver"))
        XCTAssertEqual(rule.all(limit: 10).count, 3)
        XCTAssertEqual(RecurrenceRuleLine.parsePattern(fromLine: line)?.until, until)
    }

    func testAllDayUntilUsesDateOnlyAndIncludesFinalDay() throws {
        let start = try instant("2026-03-07T00:00:00.000Z")
        let line = try XCTUnwrap(RecurrenceRuleLine.buildLine(pattern: .init(frequency: .daily, until: try instant("2026-03-09T00:00:00.000Z")),
            scheduleStart: start, scheduleEnd: start.addingTimeInterval(86400), timeZoneIdentifier: "UTC", isAllDay: true))
        XCTAssertEqual(line, "RRULE:FREQ=DAILY;UNTIL=20260309")
        let rule = try XCTUnwrap(RecurrenceRule(startDateISO: "2026-03-07", endDateISO: "2026-03-08",
            recurrenceRule: line, timeZoneIdentifier: "UTC"))
        XCTAssertEqual(rule.all(limit: 10).count, 3)
    }

    func testExistingNativeAllDayUntilSuffixStillLimitsExpansion() throws {
        let rule = try XCTUnwrap(RecurrenceRule(startDateISO: "2026-03-07", endDateISO: "2026-03-08",
            recurrenceRule: "RRULE:FREQ=DAILY;UNTIL=20260309Z", timeZoneIdentifier: "UTC"))
        XCTAssertEqual(rule.all(limit: 10).count, 3)
    }

    func testYearlyIntervalsExpandBeyondTheDailyScanHorizon() throws {
        let rule = try XCTUnwrap(RecurrenceRule(startDateISO: "2026-03-07", endDateISO: "2026-03-08",
            recurrenceRule: "RRULE:FREQ=YEARLY;INTERVAL=12;COUNT=3", timeZoneIdentifier: "UTC"))
        let formatter = ISO8601DateFormatter()
        XCTAssertEqual(rule.all(limit: 10).map { String(formatter.string(from: $0).prefix(10)) },
            ["2026-03-07", "2038-03-07", "2050-03-07"])
    }

    func testYearlyAndCountLimitedPatternsRoundTrip() throws {
        let pattern = try XCTUnwrap(RecurrenceRuleLine.parsePattern(fromLine: "RRULE:FREQ=YEARLY;INTERVAL=2;COUNT=4"))
        let start = try instant("2026-03-07T17:00:00.000Z")
        let line = RecurrenceRuleLine.buildLine(pattern: pattern, scheduleStart: start,
            scheduleEnd: start.addingTimeInterval(3600), timeZoneIdentifier: "America/Denver", isAllDay: false)
        XCTAssertEqual(line, "RRULE:FREQ=YEARLY;INTERVAL=2;COUNT=4")
    }

    func testDateOnlyUntilRoundTripsInDisplayTimezoneIncludingLegacySuffix() throws {
        for suffix in ["", "Z"] {
            let pattern = try XCTUnwrap(RecurrenceRuleLine.parsePattern(
                fromLine: "RRULE:FREQ=DAILY;UNTIL=20260309" + suffix,
                timeZoneIdentifier: "America/Denver", isAllDay: true))
            XCTAssertEqual(pattern.until, try instant("2026-03-09T06:00:00.000Z"))
            let start = try instant("2026-03-07T07:00:00.000Z")
            XCTAssertEqual(RecurrenceRuleLine.buildLine(pattern: pattern, scheduleStart: start,
                scheduleEnd: start.addingTimeInterval(86400), timeZoneIdentifier: "America/Denver", isAllDay: true),
                "RRULE:FREQ=DAILY;UNTIL=20260309")
        }
    }

    func testInclusiveEndDateUsesCalendarDaysAcrossDST() throws {
        let midnight = try instant("2026-03-08T07:00:00.000Z")
        let end = RecurrenceRuleLine.inclusiveEndDate(midnight, timeZoneIdentifier: "America/Denver")
        XCTAssertEqual(end, try instant("2026-03-09T05:59:59.000Z"))
        XCTAssertEqual(end.timeIntervalSince(midnight), 23 * 3600 - 1)
    }

    private func instant(_ value: String) throws -> Date {
        try XCTUnwrap(CompassDateParsing.parseInEffectiveTimeZone(value))
    }
}
