import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class GridEventDraftCalendarMappingTests: XCTestCase {
    func testOrdinaryEditOmitsCalendarMoveFromTheWireRequest() throws {
        let event = try StoreSampleEvents.timedEvent(id: "edit-calendar")
        var draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: event))
        draft.title = "Updated title"
        let input = try XCTUnwrap(GridEventDraftMapping.replaceInput(from: draft, originalCalendarId: event.calendarId, scope: .this))
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(input)) as? [String: Any])
        XCTAssertNil(object["calendarId"], "The backend treats any calendarId as an unsupported move")
    }

    func testChangedCalendarRemainsAvailableForLocalMoves() throws {
        let event = try StoreSampleEvents.timedEvent(id: "local-move")
        var draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: event))
        draft.calendarId = "other-calendar"
        let input = try XCTUnwrap(GridEventDraftMapping.replaceInput(
            from: draft, originalCalendarId: event.calendarId, scope: .all))
        XCTAssertEqual(input.calendarId?.rawValue, "other-calendar")
    }

    func testCloudEditorKeepsItsCalendarWhileLocalEditorCanMove() throws {
        let previous = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = previous }
        let environment = try NativeCalendarEnvironment(appURL: URL(string: "https://compass.invalid")!,
            inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment)
        let event = try StoreSampleEvents.timedEvent(id: "cloud-edit")
        let draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: event))
        model.draftStore.startGridDraft(activity: .keyboardEdit, draft: draft)
        model.eventsStore.setSource(.remote)
        XCTAssertFalse(model.canChangeDraftCalendar)
        model.updateDraftFromForm(title: "Still editable", calendarId: "other-calendar")
        XCTAssertEqual(model.draftStore.gridDraft?.calendarId, event.calendarId)
        XCTAssertEqual(model.draftStore.gridDraft?.title, "Still editable")
        model.eventsStore.setSource(.local)
        XCTAssertTrue(model.canChangeDraftCalendar)
        model.updateDraftFromForm(calendarId: "other-calendar")
        XCTAssertEqual(model.draftStore.gridDraft?.calendarId?.rawValue, "other-calendar")
        model.eventsStore.setSource(.remote)
        model.draftStore.startGridDraft(activity: .createShortcut,
            draft: GridEventDraft(clientId: "new", schedule: draft.schedule, calendarId: event.calendarId))
        XCTAssertTrue(model.canChangeDraftCalendar)
        model.updateDraftFromForm(calendarId: "new-target")
        XCTAssertEqual(model.draftStore.gridDraft?.calendarId?.rawValue, "new-target")
    }

}
