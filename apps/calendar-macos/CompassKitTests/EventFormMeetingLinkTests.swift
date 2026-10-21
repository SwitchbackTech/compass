import XCTest
@testable import CompassKit

final class EventFormMeetingLinkTests: XCTestCase {
    func testResolvesConferenceURLForEditDraft() {
        let event = Event(
            calendarId: CalendarId(rawValue: "demo-calendar"),
            content: .details(
                EventContent_DetailsPayload(
                    conference: .init(label: "Google Meet", url: "https://meet.google.com/abc-defg-hij"),
                    description: "",
                    kind: "details",
                    title: "Morning standup")),
            createdAt: DateTime(rawValue: "2026-06-10T15:00:00.000Z"),
            id: EventId(rawValue: "demo-morning-standup"),
            recurrence: .single(EventRecurrence_SinglePayload(kind: "single")),
            schedule: .timed(
                EventSchedule_TimedPayload(
                    end: DateTime(rawValue: "2026-06-10T09:30:00+00:00"),
                    kind: "timed",
                    start: DateTime(rawValue: "2026-06-10T09:00:00+00:00"),
                    timeZone: IANATimeZone(rawValue: "UTC"))),
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
