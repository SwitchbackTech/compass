@testable import CompassData
import CompassKit
import XCTest

final class LocalDataExportTests: XCTestCase {
    func testExportKeepsUserRecordsAndExcludesSamples() throws {
        let user = try StoreSampleEvents.timedEvent(id: "user", title: "Personal event")
        let sample = try StoreSampleEvents.timedEvent(id: "sample", title: "Sample event")
        let record = LocalEventRecord(id: user.id, event: user, isDemo: false, exdates: ["2026-10-20"])
        let snapshot = LocalDataExport(records: [
            LocalEventRecord(id: sample.id, event: sample, isDemo: true), record,
        ], exportedAt: Date(timeIntervalSince1970: 0))
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: snapshot.encoded()) as? [String: Any])
        let events = try XCTUnwrap(json["events"] as? [[String: Any]])
        XCTAssertEqual(events.count, 1)
        let encodedRecord = try JSONSerialization.data(withJSONObject: XCTUnwrap(events.first))
        XCTAssertEqual(try JSONDecoder().decode(LocalEventRecord.self, from: encodedRecord), record)
        XCTAssertEqual(json["exportedAt"] as? String, "1970-01-01T00:00:00Z")
        XCTAssertEqual(snapshot.filename, "compass-export-1970-01-01.json")
    }

    @MainActor
    func testCancelledExportDoesNotAnnounceSuccessOrModifyStorage() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let event = try StoreSampleEvents.timedEvent(id: "user", title: "Keep me")
        let record = LocalEventRecord(id: event.id, event: event, isDemo: false)
        try environment.localEventRepository.put(record)
        let model = NativeCalendarRootModel(environment: environment)
        var called = false
        model.onExportLocalData = { data, filename in
            called = true
            XCTAssertFalse(data.isEmpty)
            XCTAssertTrue(filename.hasSuffix(".json"))
            return false
        }
        await model.exportLocalData()
        XCTAssertNil(model.statusToastStore.message)
        XCTAssertTrue(called)
        XCTAssertFalse(model.isExportingLocalData)
        XCTAssertEqual(try environment.localEventRepository.fetchAll(), [record])
    }

    @MainActor
    func testLogoutConfirmationCancelLeavesSessionAlone() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment)
        await model.authStore.bootstrap(forceDemoSignedIn: true)
        model.settingsStore.open()
        model.requestLogout()
        XCTAssertTrue(model.pendingLogoutConfirmation)
        XCTAssertFalse(model.settingsStore.isPresented)
        model.cancelLogout()
        XCTAssertFalse(model.pendingLogoutConfirmation)
        XCTAssertTrue(model.isSignedIn)
    }
    @MainActor
    func testConfirmedLogoutEndsTheSession() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment)
        await model.authStore.bootstrap(forceDemoSignedIn: true)
        model.requestLogout()
        await model.confirmLogout()
        XCTAssertFalse(model.isSignedIn)
        XCTAssertFalse(model.pendingLogoutConfirmation)
        XCTAssertFalse(model.isLoggingOut)
        XCTAssertNil(model.logoutError)
        XCTAssertFalse(model.calendars.isEmpty)
        model.authStore.closeModal()
        model.createTimedDraft(activity: .keyboardPlace)
        XCTAssertNotNil(model.draftStore.gridDraft)
    }

    @MainActor
    func testExportFailureAllowsRetryAndReportsTheProblem() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment)
        model.onExportLocalData = { _, _ in throw CocoaError(.fileWriteNoPermission) }
        await model.exportLocalData()
        XCTAssertFalse(model.isExportingLocalData)
        XCTAssertEqual(model.statusToastStore.message, "Could not export data. Try again.")
        model.onExportLocalData = { _, _ in true }
        await model.exportLocalData()
        XCTAssertEqual(model.statusToastStore.message, "Data exported")
    }

    @MainActor
    func testAnonymousBootstrapDoesNotExposeUnownedCachedCalendars() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let unrelated = LocalCalendarSentinel.synthesizeCalendar(id: CalendarId(rawValue: "remote-cached"))
        let localEvent = try StoreSampleEvents.timedEvent(id: "local", title: "Keep local calendar")
        let owned = LocalCalendarSentinel.synthesizeCalendar(id: localEvent.calendarId)
        try environment.calendarRepository.upsert(calendars: [unrelated, owned])
        try environment.localEventRepository.put(LocalEventRecord(id: localEvent.id, event: localEvent, isDemo: false))
        let model = NativeCalendarRootModel(environment: environment)
        await model.start()
        XCTAssertFalse(model.calendars.contains { $0.id == unrelated.id })
        XCTAssertTrue(model.calendars.contains { $0.id == owned.id })
        XCTAssertFalse(model.calendars.isEmpty)
    }

}
