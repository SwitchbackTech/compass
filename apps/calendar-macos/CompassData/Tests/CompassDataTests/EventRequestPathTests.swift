import CompassKit
import XCTest
@testable import CompassData

final class EventRequestPathTests: XCTestCase {
    private let occurrenceId = "507f1f77bcf86cd799439011|2026-06-10T09:00:00.000Z"

    func testReadingAnOccurrencePreservesItsIdAtTheServerBoundary() async throws {
        try await assertPath(id: occurrenceId, method: "GET") { api, id in _ = try await api.get(id: id) }
    }

    func testReplacingAnOccurrencePreservesItsIdAtTheServerBoundary() async throws {
        let sample = try StoreSampleEvents.timedEvent(id: "sample")
        let input = ReplaceEventInput(content: .init(description: "", kind: "details", location: "", title: "Updated"),
            recurrence: .preserve(.init(kind: "preserve")), schedule: sample.schedule, scope: .this)
        try await assertPath(id: occurrenceId, method: "PUT") { api, id in _ = try await api.replace(id: id, input: input) }
    }

    func testDeletingAnOccurrencePreservesItsIdAtTheServerBoundary() async throws {
        try await assertPath(id: occurrenceId, method: "DELETE") { api, id in try await api.delete(id: id, scope: .this) }
    }

    func testRespondingToAnOccurrencePreservesItsIdAtTheServerBoundary() async throws {
        try await assertPath(id: occurrenceId, method: "POST", suffix: "/rsvp") { api, id in
            try await api.rsvp(id: id, responseStatus: .accepted, scope: "single")
        }
    }

    func testOrdinaryEventIdsStillAddressTheSameResource() async throws {
        try await assertPath(id: "507f1f77bcf86cd799439011", method: "GET") { api, id in _ = try await api.get(id: id) }
    }

    private func assertPath(id: String, method: String, suffix: String = "",
        operation: (EventsAPI, EventId) async throws -> Void) async throws {
        let event = try StoreSampleEvents.timedEvent(id: id)
        let body = try JSONEncoder().encode(EventResponse(event: StoreSampleEvents.response(from: event)))
        StubURLProtocol.Handler.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, method)
            XCTAssertEqual(request.url?.path, "/api/event/\(id)\(suffix)")
            return .init(statusCode: 200, body: body)
        }
        let session = StubURLProtocol.makeSession()
        defer {
            StubURLProtocol.Handler.requestHandler = nil
            session.invalidateAndCancel()
        }
        let client = CompassAPIClient(appURL: URL(string: "https://compass.invalid")!,
            sessionStore: MemorySessionStore(tokens: nil), urlSession: session)
        try await operation(EventsAPI(client: client), EventId(rawValue: id))
    }
}
