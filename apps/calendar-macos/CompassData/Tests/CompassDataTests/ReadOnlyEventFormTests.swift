import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class ReadOnlyEventFormTests: XCTestCase {
    func testReadOnlyDraftIgnoresFieldEditsAndKeyboardPlacement() async throws {
        let (model, _, _) = try await makeModel()
        let draft = try XCTUnwrap(model.draftStore.gridDraft)
        XCTAssertFalse(model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: false, altKey: false))
        model.updateDraftFromForm(title: "Changed", description: "Changed", location: "Changed",
            calendarId: "other-calendar", color: .some(.some(.red)))
        model.setDraftTitle("Keyboard title")
        model.setDraftAllDay(true)
        model.updateDraftRecurrence(.series(rules: ["RRULE:FREQ=DAILY"]))
        model.updateDraftAttendees([.init(email: "guest@example.com", displayName: nil)])
        model.setDraftCreateConference(true)
        XCTAssertFalse(model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: true, altKey: false))
        XCTAssertEqual(model.draftStore.gridDraft, draft)
    }

    func testReadOnlyDraftCannotSaveThroughEitherEntryPoint() async throws {
        let (model, environment, event) = try await makeModel()
        var draft = try XCTUnwrap(model.draftStore.gridDraft)
        draft.title = "Stale pending edit"
        model.draftStore.setGridDraft(draft)
        await model.saveDraft()
        await model.commitSaveDraft(scope: .this)
        XCTAssertEqual(try environment.localEventRepository.fetchAll().map(\.event), [event])
        XCTAssertTrue(model.isEventFormVisible)
    }

    func testReadOnlyDraftCannotDeleteThroughEitherEntryPoint() async throws {
        let (model, environment, event) = try await makeModel()
        await model.requestDeleteFormEvent()
        await model.commitDeleteFormEvent(scope: .this)
        XCTAssertEqual(try environment.localEventRepository.fetchAll().map(\.event), [event])
        XCTAssertTrue(model.isEventFormVisible)
    }

    func testRetargetingADraftCannotBypassTheSourceCalendarPermissions() async throws {
        let (model, environment, event) = try await makeModel()
        var draft = try XCTUnwrap(model.draftStore.gridDraft)
        draft.calendarId = CalendarId(rawValue: try XCTUnwrap(model.localCalendarId))
        model.draftStore.setGridDraft(draft)
        XCTAssertTrue(model.isEventFormReadOnly(for: draft))
        await model.saveDraft()
        XCTAssertEqual(try environment.localEventRepository.fetchAll().map(\.event), [event])
    }

    func testWritableEventsStillSaveNormally() async throws {
        let (model, environment, _) = try await makeModel(canWrite: true)
        model.updateDraftFromForm(title: "Saved edit")
        await model.saveDraft()
        let event = try XCTUnwrap(environment.localEventRepository.fetchAll().first?.event)
        XCTAssertEqual(EventTitleSearch.eventTitle(event), "Saved edit")
        XCTAssertFalse(model.isEventFormVisible)
    }

    func testProviderManagedTimesStayLockedWhileTitleEditsRemainAvailable() async throws {
        let (model, _, _) = try await makeModel(canWrite: true, providerManaged: true)
        let original = try XCTUnwrap(model.draftStore.gridDraft)
        let moved = DraftSchedule(start: original.schedule.start.addingTimeInterval(3600),
            end: original.schedule.end.addingTimeInterval(3600), kind: .timed)
        model.updateDraftFromForm(title: "Allowed title", schedule: moved)
        model.setDraftAllDay(true)
        model.updateDraftRecurrence(.series(rules: ["RRULE:FREQ=DAILY"]))
        XCTAssertFalse(model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: false, altKey: false))
        XCTAssertEqual(model.draftStore.gridDraft?.title, "Allowed title")
        XCTAssertEqual(model.draftStore.gridDraft?.schedule, original.schedule)
        XCTAssertEqual(model.draftStore.gridDraft?.recurrence, original.recurrence)
    }

    func testBusyEventsStayReadOnlyEvenOnWritableCalendars() async throws {
        let (model, environment, event) = try await makeModel(canWrite: true, busy: true)
        let original = try XCTUnwrap(model.draftStore.gridDraft)
        XCTAssertTrue(model.isEventFormReadOnly(for: original))
        model.updateDraftFromForm(title: "Not allowed")
        await model.saveDraft()
        await model.requestDeleteFormEvent()
        XCTAssertEqual(model.draftStore.gridDraft, original)
        XCTAssertEqual(try environment.localEventRepository.fetchAll().map(\.event), [event])
    }

    private func makeModel(canWrite: Bool = false, providerManaged: Bool = false, busy: Bool = false) async throws -> (NativeCalendarRootModel, NativeCalendarEnvironment, Event) {
        let previous = EffectiveTimeZone.identifier
        let environment = try NativeCalendarEnvironment(appURL: URL(string: "https://compass.invalid")!,
            inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        try environment.userMetadataRepository.upsert(key: DemoDataSeeder.migrationKey, value: true)
        let sample = try StoreSampleEvents.timedEvent(id: "readonly-event")
        let event = Event(calendarId: sample.calendarId, content: busy ? .busy(.init(kind: "busy")) : sample.content,
            createdAt: sample.createdAt, id: sample.id, providerManaged: providerManaged ? true : nil,
            recurrence: sample.recurrence, schedule: sample.schedule, updatedAt: sample.updatedAt)
        let calendar = CompassCalendar(access: canWrite ? .owner : .reader, backgroundColor: "#ffffff",
            capabilities: .init(canInviteAttendees: false, canManage: false, canReadAvailability: true,
                canReadDetails: true, canWatchEvents: false, canWrite: canWrite, conferenceKinds: []),
            description: "", foregroundColor: "#000000", id: event.calendarId.rawValue,
            isActive: true, isPrimary: false, isVisible: true, name: "Shared calendar", provider: "local", timeZone: "UTC")
        try environment.calendarRepository.upsert(calendars: [calendar])
        try environment.localEventRepository.put(.init(id: event.id, event: event, isDemo: false))
        let model = NativeCalendarRootModel(environment: environment)
        model.viewStore.setPinnedTimeZone("UTC")
        model.viewStore.anchorDate = try XCTUnwrap(CompassDateParsing.parseInEffectiveTimeZone("2026-01-01T12:00:00.000Z"))
        addTeardownBlock { EffectiveTimeZone.identifier = previous }
        await model.start()
        model.focusEvent(eventId: event.id.rawValue)
        model.openKeyboardEditForFocusedEvent()
        return (model, environment, event)
    }
}
