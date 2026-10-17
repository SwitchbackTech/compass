import CompassKit
import Foundation

extension LocalEventRepository {
    /// Canonical local writes, unlike the temporary projections used for remote API requests.
    func replaceOccurrence(id: EventId, input: ReplaceEventInput, edited: Event) throws -> Bool {
        let records = try fetchAll()
        guard let key = LocalOccurrenceKey.split(id),
              let master = records.first(where: { $0.id == key.seriesId }),
              case .series(let series) = master.event.recurrence else { return false }
        if input.scope == .this {
            let event = LocalEventExpansion.copy(edited,
                recurrence: .occurrence(.init(kind: "occurrence", seriesId: master.id)))
            try put(.init(id: id, event: event, isDemo: master.isDemo))
            return true
        }
        let splits = input.scope == .thisAndFollowing
            && key.start > (LocalOccurrenceKey.start(master.event.schedule) ?? key.start)
        let removeIds = overrides(in: records, seriesId: master.id, atOrAfter: splits ? key.start : nil)
        let recurrence: EventRecurrence
        switch input.recurrence {
        case .preserve: recurrence = master.event.recurrence
        case .single(let value): recurrence = .single(value)
        case .series(let value): recurrence = .series(value)
        }
        if splits {
            let truncated = LocalEventExpansion.copy(master.event,
                recurrence: .series(.init(kind: "series", rules: truncate(series.rules, before: key.start))))
            let remainder = LocalEventExpansion.copy(edited, id: id, recurrence: recurrence)
            try apply(upserts: [
                .init(id: master.id, event: truncated, isDemo: master.isDemo, exdates: master.exdates),
                .init(id: id, event: remainder, isDemo: master.isDemo),
            ], removing: removeIds)
        } else {
            let schedule = input.scope == .all
                ? shiftedSchedule(master.event.schedule, occurrenceStart: key.start, edited: edited.schedule)
                : edited.schedule
            let event = LocalEventExpansion.copy(master.event, recurrence: recurrence,
                schedule: schedule, content: edited.content, calendarId: edited.calendarId, updatedAt: edited.updatedAt)
            try apply(upserts: [.init(id: master.id, event: event, isDemo: master.isDemo, exdates: master.exdates)],
                removing: removeIds)
        }
        return true
    }

    func deleteOccurrence(id: EventId, scope: EventDeleteScope) throws -> Bool {
        let records = try fetchAll()
        guard let key = LocalOccurrenceKey.split(id),
              let master = records.first(where: { $0.id == key.seriesId }),
              case .series(let series) = master.event.recurrence else { return false }
        if scope == .this {
            var excluded = master.exdates ?? []
            let start = LocalOccurrenceKey.string(key.start)
            if !excluded.contains(start) { excluded.append(start) }
            try apply(upserts: [.init(id: master.id, event: master.event, isDemo: master.isDemo, exdates: excluded)],
                removing: [id])
        } else if scope == .all || key.start <= (LocalOccurrenceKey.start(master.event.schedule) ?? key.start) {
            try apply(upserts: [], removing: [master.id] + overrides(in: records, seriesId: master.id))
        } else {
            let event = LocalEventExpansion.copy(master.event,
                recurrence: .series(.init(kind: "series", rules: truncate(series.rules, before: key.start))))
            try apply(upserts: [.init(id: master.id, event: event, isDemo: master.isDemo, exdates: master.exdates)],
                removing: overrides(in: records, seriesId: master.id, atOrAfter: key.start))
        }
        return true
    }

    private func overrides(in records: [LocalEventRecord], seriesId: EventId, atOrAfter cut: Date? = nil) -> [EventId] {
        records.compactMap { record in
            if case .series = record.event.recurrence { return nil }
            guard let key = LocalOccurrenceKey.split(record.id), key.seriesId == seriesId else { return nil }
            if let cut, key.start < cut { return nil }
            return record.id
        }
    }

    private func truncate(_ rules: [String], before start: Date) -> [String] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        let until = formatter.string(from: start.addingTimeInterval(-1))
        return rules.map { rule in
            guard rule.uppercased().hasPrefix("RRULE:") else { return rule }
            let parts = rule.dropFirst(6).split(separator: ";").filter {
                !$0.uppercased().hasPrefix("COUNT=") && !$0.uppercased().hasPrefix("UNTIL=")
            }
            return "RRULE:" + parts.joined(separator: ";") + ";UNTIL=" + until
        }
    }

    private func shiftedSchedule(_ base: EventSchedule, occurrenceStart: Date, edited: EventSchedule) -> EventSchedule {
        switch (base, edited) {
        case (.timed(let old), .timed(let new)):
            guard let baseStart = LocalOccurrenceKey.instant(old.start.rawValue),
                  let baseEnd = LocalOccurrenceKey.instant(old.end.rawValue),
                  let newStart = LocalOccurrenceKey.instant(new.start.rawValue),
                  let newEnd = LocalOccurrenceKey.instant(new.end.rawValue) else { return edited }
            let occurrenceEnd = occurrenceStart.addingTimeInterval(baseEnd.timeIntervalSince(baseStart))
            return .timed(.init(
                end: DateTime(rawValue: LocalOccurrenceKey.string(baseEnd.addingTimeInterval(newEnd.timeIntervalSince(occurrenceEnd)))),
                kind: "timed",
                start: DateTime(rawValue: LocalOccurrenceKey.string(baseStart.addingTimeInterval(newStart.timeIntervalSince(occurrenceStart)))),
                timeZone: new.timeZone))
        case (.allDay(let old), .allDay(let new)):
            guard let baseStart = LocalOccurrenceKey.instant(old.start), let baseEnd = LocalOccurrenceKey.instant(old.end),
                  let newStart = LocalOccurrenceKey.instant(new.start), let newEnd = LocalOccurrenceKey.instant(new.end) else { return edited }
            let duration = baseEnd.timeIntervalSince(baseStart)
            return .allDay(.init(
                end: LocalOccurrenceKey.day(baseEnd.addingTimeInterval(newEnd.timeIntervalSince(occurrenceStart.addingTimeInterval(duration)))),
                kind: "allDay",
                start: LocalOccurrenceKey.day(baseStart.addingTimeInterval(newStart.timeIntervalSince(occurrenceStart)))))
        default: return edited
        }
    }
}
