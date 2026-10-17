import CompassKit
import Foundation
import GRDB

public struct CalendarRepository: Sendable {
    private let db: any DatabaseWriter

    public init(database: AppDatabase) {
        self.db = database.writer
    }

    public func upsert(calendars: [CompassCalendar]) throws {
        guard !calendars.isEmpty else { return }
        try db.write { db in
            for calendar in calendars {
                let record = try CalendarRecordCodec.record(for: calendar)
                try record.save(db, onConflict: .replace)
            }
        }
    }

    public func removeCachedCalendars(except retainedIds: Set<String>) throws {
        try db.write { db in
            for record in try CalendarRecord.fetchAll(db) where !retainedIds.contains(record.id) {
                try CalendarRecord.deleteOne(db, key: record.id)
            }
        }
    }

    /// Apply an authoritative server list without removing device-local calendars.
    public func replaceRemote(calendars: [CompassCalendar], preservingIds: Set<String>) throws {
        let retainedIds = preservingIds.union(calendars.map(\.id))
        try db.write { db in
            for calendar in calendars {
                try CalendarRecordCodec.record(for: calendar).save(db, onConflict: .replace)
            }
            for record in try CalendarRecord.fetchAll(db) where !retainedIds.contains(record.id) {
                try CalendarRecord.deleteOne(db, key: record.id)
            }
        }
    }

    public func fetchAll() throws -> [CompassCalendar] {
        try db.read { db in
            try CalendarRecord.fetchAll(db).map { try CalendarRecordCodec.calendar(from: $0) }
        }
    }

    public func observeAll() -> ValueObservation<ValueReducers.Fetch<[CompassCalendar]>> {
        ValueObservation.tracking { db in
            try CalendarRecord.fetchAll(db).map { try CalendarRecordCodec.calendar(from: $0) }
        }
    }
}
