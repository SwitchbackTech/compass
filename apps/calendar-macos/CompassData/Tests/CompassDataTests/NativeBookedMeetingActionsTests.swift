import CompassKit
import Foundation
import XCTest
@testable import CompassData

@MainActor
final class NativeBookedMeetingActionsTests: XCTestCase {
    override func tearDown() {
        StubURLProtocol.Handler.requestHandler = nil
        super.tearDown()
    }

    func testCancellationRequiresConfirmationAndClosesFormAfterSuccess() async throws {
        let model = try await makeModel()
        let requests = RequestLog()
        StubURLProtocol.Handler.requestHandler = { request in
            requests.append(request)
            return .init(statusCode: 200)
        }
        XCTAssertTrue(model.hasBookedMeetingActions)
        await model.triggerBookedMeetingCancellation()
        XCTAssertTrue(model.isConfirmingBookingCancellation)
        XCTAssertEqual(requests.count, 0)
        await model.triggerBookedMeetingCancellation()
        XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(requests.first?.httpMethod, "POST")
        XCTAssertEqual(requests.first?.url?.path, "/api/booking/reservations/reservation-1/cancel")
        XCTAssertNil(requests.first?.value(forHTTPHeaderField: "Authorization"))
        let body = try XCTUnwrap(requests.firstBody)
        XCTAssertEqual(try JSONDecoder().decode(CancelBookingReservationInput.self, from: body).token, "secret")
        XCTAssertNil(model.draftStore.gridDraft)
        XCTAssertEqual(model.statusToastStore.message, "Meeting cancelled. Guest was emailed.")
        XCTAssertFalse(model.isCancellingBookedMeeting)
    }

    func testFailedCancellationKeepsFormAndRequiresFreshConfirmation() async throws {
        let model = try await makeModel()
        StubURLProtocol.Handler.requestHandler = { _ in .init(statusCode: 500) }
        await model.triggerBookedMeetingCancellation()
        await model.triggerBookedMeetingCancellation()
        XCTAssertNotNil(model.draftStore.gridDraft)
        XCTAssertFalse(model.isConfirmingBookingCancellation)
        XCTAssertFalse(model.isCancellingBookedMeeting)
        XCTAssertEqual(model.statusToastStore.message, "Could not cancel meeting. Try again.")
        await model.triggerBookedMeetingCancellation()
        XCTAssertTrue(model.isConfirmingBookingCancellation)
    }

    func testAlreadyCancelledClosesForm() async throws {
        for status in [404, 409] {
            let model = try await makeModel()
            StubURLProtocol.Handler.requestHandler = { _ in .init(statusCode: status) }
            await model.triggerBookedMeetingCancellation()
            await model.triggerBookedMeetingCancellation()
            XCTAssertNil(model.draftStore.gridDraft)
            XCTAssertEqual(model.statusToastStore.message, "This meeting was already cancelled.")
        }
    }

    func testResetAndRescheduleClearConfirmation() async throws {
        let model = try await makeModel()
        await model.triggerBookedMeetingCancellation()
        XCTAssertTrue(model.cancelBookedMeetingConfirmation())
        XCTAssertFalse(model.isConfirmingBookingCancellation)
        await model.triggerBookedMeetingCancellation()
        var opened: URL?
        model.openExternalURLHandler = { opened = $0 }
        model.rescheduleBookedMeeting()
        XCTAssertEqual(opened?.absoluteString, "https://compass.invalid/meet/reschedule/reservation-1?token=secret")
        XCTAssertFalse(model.isConfirmingBookingCancellation)
        XCTAssertNotNil(model.draftStore.gridDraft)
    }

    func testForeignOriginDoesNotExposeBookingActions() async throws {
        let model = try await makeModel(origin: "https://untrusted.invalid")
        XCTAssertFalse(model.hasBookedMeetingActions)
        await model.triggerBookedMeetingCancellation()
        XCTAssertFalse(model.isConfirmingBookingCancellation)
    }

    func testChangedBookingTokenRequiresConfirmationAgain() async throws {
        let model = try await makeModel()
        await model.triggerBookedMeetingCancellation()
        let draft = try XCTUnwrap(model.draftStore.gridDraft)
        let source = try XCTUnwrap(model.baselineEvent(for: draft))
        guard case .details(let details) = source.content else { return XCTFail("Expected details") }
        let changedContent: EventContent = .details(.init(description: details.description.replacingOccurrences(of: "token=secret", with: "token=replaced"), kind: "details", title: details.title))
        let changed = Event(calendarId: source.calendarId, content: changedContent,
            createdAt: source.createdAt, id: source.id, recurrence: source.recurrence,
            schedule: source.schedule, updatedAt: source.updatedAt)
        model.loadedEvents = model.loadedEvents.map { $0.id == source.id ? changed : $0 }
        XCTAssertFalse(model.isConfirmingBookingCancellation)
        let requests = RequestLog()
        StubURLProtocol.Handler.requestHandler = { request in
            requests.append(request)
            return .init(statusCode: 200)
        }
        await model.triggerBookedMeetingCancellation()
        XCTAssertTrue(model.isConfirmingBookingCancellation)
        XCTAssertEqual(requests.count, 0)
    }

    private func makeModel(origin: String = "https://compass.invalid") async throws -> NativeCalendarRootModel {
        let environment = try NativeCalendarEnvironment(
            appURL: URL(string: "https://compass.invalid")!, inMemoryDatabase: true,
            sessionStore: MemorySessionStore(), urlSession: StubURLProtocol.makeSession())
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        let source = try XCTUnwrap(model.loadedEvents.first { $0.id.rawValue == "demo-morning-standup" })
        let description = "<a href='\(origin)/meet/cancel/reservation-1?token=secret'>Cancel</a> <a href='\(origin)/meet/reschedule/reservation-1?token=secret'>Reschedule</a>"
        let event = Event(calendarId: source.calendarId,
            content: .details(.init(description: description, kind: "details", title: "Booked meeting")),
            createdAt: source.createdAt, id: source.id, recurrence: source.recurrence,
            schedule: source.schedule, updatedAt: source.updatedAt)
        model.loadedEvents = model.loadedEvents.map { $0.id == source.id ? event : $0 }
        model.focusGridEvent(eventId: source.id.rawValue)
        model.openKeyboardEditForFocusedEvent()
        return model
    }
}

private final class RequestLog: @unchecked Sendable {
    private let lock = NSLock()
    private var requests: [URLRequest] = []
    private var bodies: [Data] = []
    func append(_ request: URLRequest) {
        var body = request.httpBody ?? Data()
        if let stream = request.httpBodyStream {
            stream.open()
            defer { stream.close() }
            var buffer = [UInt8](repeating: 0, count: 1024)
            while true {
                let count = stream.read(&buffer, maxLength: buffer.count)
                guard count > 0 else { break }
                body.append(contentsOf: buffer.prefix(count))
            }
        }
        lock.withLock { requests.append(request); bodies.append(body) }
    }
    var firstBody: Data? { lock.withLock { bodies.first } }
    var count: Int { lock.withLock { requests.count } }
    var first: URLRequest? { lock.withLock { requests.first } }
}
