import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class NativeCalendarClockTests: XCTestCase {
    func testMinuteRefreshAdvancesNowLineWithoutChangingDraftOrNavigation() async throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        var now = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-18T15:00:00Z"))
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore())
        let model = NativeCalendarRootModel(environment: environment, now: { now })
        await model.start()
        model.viewStore.setAnchorDate(now)
        model.handleShortcut(.navDayView)
        model.createTimedDraft(activity: .createShortcut)
        model.setDraftTitle("Keep my draft")
        model.pendingScroll = nil
        let draft = model.draftStore.gridDraft
        let anchor = model.viewStore.anchorDate
        let before = try XCTUnwrap(model.timeGridState.snapshot(colWidths: model.timeGridState.resolvedColumnWidths()).nowLine)
        now = now.addingTimeInterval(60)
        await model.refreshSideband()
        XCTAssertEqual(model.timeGridState.referenceNow, now)
        XCTAssertEqual(model.timeGridState.scenario.referenceNow, now)
        let after = try XCTUnwrap(model.timeGridState.snapshot(colWidths: model.timeGridState.resolvedColumnWidths()).nowLine)
        XCTAssertGreaterThan(after.top, before.top)
        XCTAssertEqual(model.draftStore.gridDraft, draft)
        XCTAssertEqual(model.viewStore.anchorDate, anchor)
        XCTAssertNil(model.pendingScroll)
    }

    func testDemoClockStaysPinnedDuringMinuteRefresh() async throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        let fixture = try DemoSeedFixture.load()
        var now = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-18T15:00:00Z"))
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore())
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture, now: { now })
        await model.start()
        now = now.addingTimeInterval(3600)
        await model.refreshSideband()
        XCTAssertEqual(model.timeGridState.referenceNow, fixture.referenceNow)
        XCTAssertEqual(model.timeGridState.scenario.referenceNow, fixture.referenceNow)
    }
}
