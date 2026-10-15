import CompassKit
import Foundation

enum EventScheduleBounds {
    static func bounds(for event: Event) -> (startsAt: String, endsAt: String, allDay: Bool) {
        switch event.schedule {
        case .allDay(let payload):
            return (payload.start, payload.end, true)
        case .timed(let payload):
            return (payload.start.rawValue, payload.end.rawValue, false)
        }
    }

    /// Compares instants, not strings: an event stored as UTC ("…Z") and a
    /// query range in the local offset sort differently as text once the UTC
    /// date rolls over, which dropped evening events from Up next.
    static func intersectsQueryRange(event: Event, start: String, end: String) -> Bool {
        let bounds = bounds(for: event)
        guard let eventStart = CompassDateParsing.parseInEffectiveTimeZone(bounds.startsAt),
              let eventEnd = CompassDateParsing.parseInEffectiveTimeZone(bounds.endsAt),
              let rangeStart = CompassDateParsing.parseInEffectiveTimeZone(start),
              let rangeEnd = CompassDateParsing.parseInEffectiveTimeZone(end)
        else {
            return bounds.startsAt < end && bounds.endsAt > start
        }
        return eventStart < rangeEnd && eventEnd > rangeStart
    }

    static func searchText(for event: Event) -> (title: String, description: String) {
        switch event.content {
        case .busy:
            return ("", "")
        case .details(let payload):
            return (payload.title, payload.description)
        }
    }
}
