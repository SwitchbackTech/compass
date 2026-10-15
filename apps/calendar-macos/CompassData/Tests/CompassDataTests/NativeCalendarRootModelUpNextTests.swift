import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelUpNextTests: XCTestCase {
    /// Regression: anonymous local-mode users saw "All clear" because the
    /// sideband only loaded for signed-in sessions.
    func testLocalModeUpNextShowsTheNextLocalEvent() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        XCTAssertEqual(environment.eventsStore.source, .local)
        let model = NativeCalendarRootModel(environment: environment)
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = EffectiveTimeZone.timeZone
        let start = Date().addingTimeInterval(10 * 60)
        let json = """
        {
          "id": "local-up-next",
          "calendarId": "507f1f77bcf86cd799439011",
          "content": { "kind": "details", "title": "Coffee", "description": "" },
          "createdAt": "2026-06-10T15:00:00.000Z",
          "updatedAt": null,
          "recurrence": { "kind": "single" },
          "schedule": {
            "kind": "timed",
            "start": "\(formatter.string(from: start))",
            "end": "\(formatter.string(from: start.addingTimeInterval(30 * 60)))",
            "timeZone": "\(EffectiveTimeZone.identifier)"
          }
        }
        """
        let event = try JSONDecoder().decode(Event.self, from: Data(json.utf8))
        try environment.localEventRepository.putMany([
            LocalEventRecord(id: event.id, event: event, isDemo: false),
        ])

        await model.refreshSideband()

        XCTAssertEqual(model.upNextState.snapshot.upNext?.title, "Coffee")
    }
}
