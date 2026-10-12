import CompassKit
import EventKit
import Foundation

public struct SystemCalendarConnector: @unchecked Sendable {
    private let accessClient: any SystemCalendarAccessClient
    private let eventStore: EKEventStore

    public init(
        accessClient: any SystemCalendarAccessClient = LiveSystemCalendarAccessClient(),
        eventStore: EKEventStore = EKEventStore()
    ) {
        self.accessClient = accessClient
        self.eventStore = eventStore
    }

    public func connect() async -> Result<[CompassCalendar], SystemCalendarConnectFailure> {
        let status = accessClient.authorizationStatus()
        let resolved: SystemCalendarAccessResult
        if status == .granted {
            resolved = .granted
        } else {
            resolved = await accessClient.requestAccess()
        }
        switch resolved {
        case .granted:
            let calendars = eventStore.calendars(for: .event).map(SystemCalendarMapper.compassCalendar(from:))
            SystemCalendarConnectionStore.markConnected()
            return .success(calendars)
        case .denied:
            return .failure(.denied)
        case .restricted:
            return .failure(.restricted)
        }
    }

    public func fetchEvents(start: Date, end: Date) -> [Event] {
        guard SystemCalendarConnectionStore.isConnected else { return [] }
        let predicate = eventStore.predicateForEvents(withStart: start, end: end, calendars: nil)
        let now = Date()
        return eventStore.events(matching: predicate).compactMap { ekEvent in
            guard let calendarId = ekEvent.calendar.map({ SystemCalendarMapper.calendarId(for: $0) })
            else { return nil }
            return SystemCalendarMapper.event(from: ekEvent, calendarId: calendarId, now: now)
        }
    }
}

public enum SystemCalendarConnectFailure: Sendable, Equatable {
    case denied
    case restricted
}
