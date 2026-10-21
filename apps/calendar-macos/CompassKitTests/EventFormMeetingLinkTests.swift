import XCTest
@testable import CompassKit

final class EventFormMeetingLinkTests: XCTestCase {
    func testResolvesConferenceURLForEditDraft() {
        let details = EventContent_DetailsPayload(
            conference: .init(label: "Google Meet", url: "https://meet.google.com/abc-defg-hij"),
            description: "",
            kind: "details",
            title: "Morning standup")
        let event = Event(
            calendarId: CalendarId(rawValue: "demo-calendar"),
            content: .details(details),
            createdAt: .init(rawValue: "2026-06-10T15:00:00.000Z"),
            id: EventId(rawValue: "demo-morning-standup"),
            recurrence: .single,
            schedule: .timed(.init(
                start: .init(rawValue: "2026-06-10T09:00:00+00:00"),
                end: .init(rawValue: "2026-06-10T09:30:00+00:00"),
                timeZone: "UTC")),
            updatedAt: nil)

        XCTAssertEqual(
            EventFormMeetingLink.url(isEditDraft: true, baseline: event),
            "https://meet.google.com/abc-defg-hij")
        XCTAssertEqual(EventFormMeetingLink.label(baseline: event), "Google Meet")
    }

    func testCreateDraftHasNoMeetingLinkURL() {
        XCTAssertNil(EventFormMeetingLink.url(isEditDraft: false, baseline: nil))
    }
}
