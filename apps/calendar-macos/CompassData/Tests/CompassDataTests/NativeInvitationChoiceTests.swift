import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class NativeInvitationChoiceTests: XCTestCase {
    func testDontSendChoiceEncodesExplicitNoneInEventRequest() throws {
        let model = NativeCalendarRootModel(environment: try NativeCalendarEnvironment(inMemoryDatabase: true))
        let draft = GridEventDraft(
            clientId: .init(rawValue: "invitation-choice"),
            schedule: .init(start: Date(), end: Date().addingTimeInterval(3600), kind: .timed),
            title: "Meeting", calendarId: .init(rawValue: "cal-1"),
            attendees: [.init(email: "guest@example.com", displayName: "Guest")])
        model.draftStore.startGridDraft(activity: .keyboardPlace, draft: draft)
        model.pendingInvitationDraft = draft
        model.confirmInvitationDontSend()
        let request = try XCTUnwrap(GridEventDraftMapping.createInput(
            from: draft, invitation: model.pendingSaveInvitation))
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(request)) as? [String: Any])
        XCTAssertEqual(json["invitation"] as? String, "none")
    }
}
