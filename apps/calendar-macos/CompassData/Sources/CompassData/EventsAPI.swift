import CompassKit
import Foundation

public struct EventListQuery: Sendable {
    public var kind: String
    public var start: String
    public var end: String
    public var calendarIds: [CalendarId]?
    public var q: String?

    public init(
        kind: String,
        start: String,
        end: String,
        calendarIds: [CalendarId]? = nil,
        q: String? = nil
    ) {
        self.kind = kind
        self.start = start
        self.end = end
        self.calendarIds = calendarIds
        self.q = q
    }
}

public enum EventDeleteScope: String, Sendable {
    case this
    case thisAndFollowing
    case all
}

public struct EventsAPI: Sendable {
    private let client: CompassAPIClient

    init(client: CompassAPIClient) {
        self.client = client
    }

    public func list(_ query: EventListQuery) async throws -> [Event] {
        var items = [
            URLQueryItem(name: "kind", value: query.kind),
            URLQueryItem(name: "start", value: query.start),
            URLQueryItem(name: "end", value: query.end),
        ]
        if let calendarIds = query.calendarIds, !calendarIds.isEmpty {
            items.append(URLQueryItem(name: "calendarIds", value: calendarIds.map(\.rawValue).joined(separator: ",")))
        }
        if let q = query.q {
            items.append(URLQueryItem(name: "q", value: q))
        }
        let response: EventListResponse = try await client.sendDecodable(
            method: "GET",
            path: "event",
            queryItems: items
        )
        return response.events
    }

    public func get(id: EventId) async throws -> EventResponseEvent {
        let response: EventResponse = try await client.sendDecodable(
            method: "GET",
            path: eventPath(id)
        )
        return response.event
    }

    public func create(_ input: CreateEventInput) async throws -> EventResponseEvent {
        let response: EventResponse = try await client.sendDecodable(
            method: "POST",
            path: "event",
            body: input
        )
        return response.event
    }

    public func replace(id: EventId, input: ReplaceEventInput) async throws -> EventResponseEvent {
        let response: EventResponse = try await client.sendDecodable(
            method: "PUT",
            path: eventPath(id),
            body: input
        )
        return response.event
    }

    public func delete(id: EventId, scope: EventDeleteScope) async throws {
        try await client.sendVoid(
            method: "DELETE",
            path: eventPath(id),
            queryItems: [URLQueryItem(name: "scope", value: scope.rawValue)]
        )
    }

    public func rsvp(id: EventId, responseStatus: ResponseStatusEnum, scope: String) async throws {
        let body = RsvpWireInput(responseStatus: responseStatus, scope: scope)
        try await client.sendVoid(
            method: "POST",
            path: eventPath(id, suffix: "/rsvp"),
            body: body
        )
    }

    private func eventPath(_ id: EventId, suffix: String = "") -> String {
        "event/\(id.rawValue)\(suffix)"
    }
}
