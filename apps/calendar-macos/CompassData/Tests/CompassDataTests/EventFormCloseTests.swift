import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class EventFormCloseTests: XCTestCase {
    func testUnchangedExistingEventClosesWithoutDiscardConfirmation() throws {
        let model = try makeModel()
        model.requestCloseEventForm()
        XCTAssertFalse(model.pendingDiscardDraftConfirmation)
        XCTAssertFalse(model.isEventFormVisible)
    }

    func testChangedExistingEventRequiresConfirmationAndCancelKeepsEdits() throws {
        let model = try makeModel()
        model.draftStore.setTitle("Unsaved edit")
        model.requestCloseEventForm()
        XCTAssertTrue(model.pendingDiscardDraftConfirmation)
        XCTAssertTrue(model.isEventFormVisible)
        model.cancelDiscardDraftConfirmation()
        XCTAssertFalse(model.pendingDiscardDraftConfirmation)
        XCTAssertEqual(model.draftStore.gridDraft?.title, "Unsaved edit")
    }

    func testRevertedEditClosesWithoutDiscardConfirmation() throws {
        let model = try makeModel()
        let title = try XCTUnwrap(model.draftStore.gridDraft?.title)
        model.draftStore.setTitle("Temporary edit")
        model.draftStore.setTitle(title)
        model.requestCloseEventForm()
        XCTAssertFalse(model.pendingDiscardDraftConfirmation)
        XCTAssertFalse(model.isEventFormVisible)
    }

    func testNewDraftClosesWithoutConfirmationLikeWeb() throws {
        let model = try makeModel()
        var draft = try XCTUnwrap(model.draftStore.gridDraft)
        draft.kind = .create
        draft.sourceEventId = nil
        model.draftStore.startGridDraft(activity: .createShortcut, draft: draft)
        model.draftStore.setFormOpen(true)
        model.draftStore.setTitle("New draft")
        model.requestCloseEventForm()
        XCTAssertFalse(model.pendingDiscardDraftConfirmation)
        XCTAssertFalse(model.isEventFormVisible)
    }

    private func makeModel() throws -> NativeCalendarRootModel {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment)
        let event = try StoreSampleEvents.timedEvent(id: "existing-event")
        let draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: event))
        model.draftStore.startGridDraft(activity: .keyboardEdit, draft: draft)
        XCTAssertTrue(model.isEventFormVisible)
        return model
    }
}
