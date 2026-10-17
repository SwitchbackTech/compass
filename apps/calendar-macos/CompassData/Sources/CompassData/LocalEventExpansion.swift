import CompassKit
import Foundation

/// Read projection only. Export and promotion continue to use the compact stored records.
enum LocalEventExpansion {
    static func records(from stored: [LocalEventRecord]) -> [LocalEventRecord] {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let storedIds = Set(stored.map(\.id))
        // Older native fixtures and caches already contain materialized instances.
        let materializedSeries = Set(stored.compactMap { record -> EventId? in
            guard case .occurrence(let value) = record.event.recurrence,
                  LocalOccurrenceKey.split(record.id)?.seriesId != value.seriesId else { return nil }
            return value.seriesId
        })
        return stored.flatMap { record -> [LocalEventRecord] in
            guard case .series(let series) = record.event.recurrence,
                  !materializedSeries.contains(record.id) else { return [record] }
            let excluded = Set((record.exdates ?? []).compactMap(LocalOccurrenceKey.instant))
            var starts = Set<Date>()
            var result = [record]
            for line in series.rules {
                guard let rule = rule(event: record.event, line: line) else { continue }
                for start in rule.occurrences(from: rule.startDate, limit: 730) {
                    guard starts.insert(start).inserted, !excluded.contains(start) else { continue }
                    let stamp = formatter.string(from: start)
                    let id = EventId(rawValue: record.id.rawValue + "::" + stamp)
                    guard !storedIds.contains(id) else { continue }
                    let schedule: EventSchedule
                    switch record.event.schedule {
                    case .timed(let timed):
                        schedule = .timed(.init(
                            end: DateTime(rawValue: formatter.string(from: start.addingTimeInterval(rule.endDate.timeIntervalSince(rule.startDate)))),
                            kind: "timed", start: DateTime(rawValue: stamp),
                            timeZone: timed.timeZone))
                    case .allDay:
                        let days = LocalOccurrenceKey.calendar.dateComponents([.day], from: rule.startDate, to: rule.endDate).day ?? 1
                        let end = LocalOccurrenceKey.calendar.date(byAdding: .day, value: days, to: start) ?? start
                        schedule = .allDay(.init(end: String(formatter.string(from: end).prefix(10)), kind: "allDay", start: String(stamp.prefix(10))))
                    }
                    let event = copy(record.event, id: id,
                        recurrence: .occurrence(.init(kind: "occurrence", seriesId: record.id)), schedule: schedule)
                    result.append(.init(id: id, event: event, isDemo: record.isDemo))
                }
            }
            return result
        }
    }

    static func rule(event: Event, line: String) -> RecurrenceRule? {
        switch event.schedule {
        case .timed(let timed):
            return RecurrenceRule(startDateISO: timed.start.rawValue, endDateISO: timed.end.rawValue,
                recurrenceRule: line, timeZoneIdentifier: timed.timeZone.rawValue)
        case .allDay(let allDay):
            return RecurrenceRule(startDateISO: allDay.start, endDateISO: allDay.end,
                recurrenceRule: line, timeZoneIdentifier: "UTC")
        }
    }

    static func copy(_ event: Event, id: EventId? = nil, recurrence: EventRecurrence? = nil,
        schedule: EventSchedule? = nil, content: EventContent? = nil, calendarId: CalendarId? = nil,
        updatedAt: DateTime? = nil) -> Event {
        Event(calendarId: calendarId ?? event.calendarId, content: content ?? event.content,
            createdAt: event.createdAt, icalUid: event.icalUid, id: id ?? event.id,
            popupReminderMinutes: event.popupReminderMinutes, providerManaged: event.providerManaged,
            recurrence: recurrence ?? event.recurrence, schedule: schedule ?? event.schedule,
            updatedAt: updatedAt ?? event.updatedAt)
    }
}

/// Local split-series ids can themselves contain an occurrence separator.
enum LocalOccurrenceKey {
    static var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)!
        return value
    }

    static func split(_ id: EventId) -> (seriesId: EventId, start: Date)? {
        guard let range = id.rawValue.range(of: "::", options: .backwards),
              let start = instant(String(id.rawValue[range.upperBound...])) else { return nil }
        return (EventId(rawValue: String(id.rawValue[..<range.lowerBound])), start)
    }

    static func instant(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let normalized = value.count == 10 ? value + "T00:00:00.000Z" : value
        if let date = formatter.date(from: normalized) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: normalized)
    }

    static func string(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    static func day(_ date: Date) -> String { String(string(date).prefix(10)) }

    static func start(_ schedule: EventSchedule) -> Date? {
        switch schedule {
        case .timed(let value): instant(value.start.rawValue)
        case .allDay(let value): instant(value.start)
        }
    }
}
