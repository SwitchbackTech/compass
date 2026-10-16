import CompassKit
import XCTest
@testable import CompassData

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

    /// Regression: a just-created event stayed out of Up next ("All clear")
    /// until the 60 s sideband timer, because saves only reloaded the grid.
    func testReloadingLoadedEventsUpdatesUpNextImmediately() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment)
        await model.refreshSideband()
        XCTAssertNil(model.upNextState.snapshot.upNext)

        model.loadedEvents = [try Self.timedEvent(title: "Just created", startingIn: 10 * 60)]

        XCTAssertEqual(model.upNextState.snapshot.upNext?.title, "Just created")
    }

    /// Regression: after undo, redo, undo of a create, Up next and the menu bar
    /// agenda still showed the event ("Untitled event in 2m").
    func testUndoRedoUndoOfACreateClearsUpNext() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment)
        await model.start()
        // The redo re-creates on a writable calendar, so reuse the seed's.
        let calendarId = try XCTUnwrap(model.loadedEvents.first?.calendarId.rawValue)
        let event = try Self.timedEvent(title: "Just created", startingIn: 2 * 60, calendarId: calendarId)
        let upNextTitle = { model.upNextState.snapshot.upNext?.title }
        try environment.localEventRepository.putMany([
            LocalEventRecord(id: event.id, event: event, isDemo: false),
        ])
        model.loadedEvents = [event]
        model.recordCreateUndo(for: event)
        XCTAssertEqual(upNextTitle(), "Just created")

        await model.undoLastChangeAndWait()
        XCTAssertNotEqual(upNextTitle(), "Just created")

        model.redoLastChange()
        for _ in 0 ..< 40 where upNextTitle() != "Just created" {
            try await Task.sleep(for: .milliseconds(50))
        }
        XCTAssertEqual(upNextTitle(), "Just created")

        await model.undoLastChangeAndWait()
        XCTAssertNotEqual(upNextTitle(), "Just created")
    }

    private static func timedEvent(
        title: String,
        startingIn interval: TimeInterval,
        calendarId: String = "507f1f77bcf86cd799439011"
    ) throws -> Event {
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = EffectiveTimeZone.timeZone
        let start = Date().addingTimeInterval(interval)
        let json = """
        {
          "id": "just-created",
          "calendarId": "\(calendarId)",
          "content": { "kind": "details", "title": "\(title)", "description": "" },
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
        return try JSONDecoder().decode(Event.self, from: Data(json.utf8))
    }
}
