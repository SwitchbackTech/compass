import CompassData
import CompassKit
import XCTest

final class DemoDataSeederTests: XCTestCase {
    func testSeedIsIdempotent() throws {
        let database = try AppDatabase.inMemory()
        let localEvents = LocalEventRepository(database: database)
        let metadata = UserMetadataRepository(database: database)
        let fixture = try DemoSeedFixture.load()

        try DemoDataSeeder.seedIfNeeded(
            localEvents: localEvents,
            metadata: metadata,
            fixture: fixture)
        let firstCount = try localEvents.fetchAll().count
        XCTAssertGreaterThan(firstCount, 0)

        try DemoDataSeeder.seedIfNeeded(
            localEvents: localEvents,
            metadata: metadata,
            fixture: fixture)
        let secondCount = try localEvents.fetchAll().count
        XCTAssertEqual(firstCount, secondCount)
    }

    func testSeedWithoutPresentationLandsOnTodayInTheSystemZone() throws {
        let database = try AppDatabase.inMemory()
        let localEvents = LocalEventRepository(database: database)
        let metadata = UserMetadataRepository(database: database)
        let zone = TimeZone(identifier: "America/Los_Angeles")!
        // 2026-10-15 08:00 in Los Angeles.
        let now = Date(timeIntervalSince1970: 1_792_076_400)

        try DemoDataSeeder.seedIfNeeded(
            localEvents: localEvents, metadata: metadata, now: now, timeZone: zone)

        let events = try localEvents.fetchAll().map(\.event)
        let standup = try XCTUnwrap(events.first { $0.id.rawValue == "demo-morning-standup" })
        guard case .timed(let schedule) = standup.schedule else { return XCTFail("standup is timed") }
        XCTAssertEqual(schedule.start.rawValue, "2026-10-15T09:00:00-07:00")
        XCTAssertEqual(schedule.end.rawValue, "2026-10-15T09:30:00-07:00")
        XCTAssertEqual(schedule.timeZone.rawValue, "America/Los_Angeles")

        let allDay = events.compactMap { event -> EventSchedule_AllDayPayload? in
            if case .allDay(let payload) = event.schedule { return payload }
            return nil
        }
        XCTAssertEqual(allDay.map(\.start), ["2026-10-15"])
        XCTAssertEqual(allDay.map(\.end), ["2026-10-16"])

        let occurrenceIds = events.map(\.id.rawValue).filter { $0.hasPrefix("demo-weekly-sync|") }.sorted()
        XCTAssertEqual(occurrenceIds, [
            "demo-weekly-sync|2026-10-15T21:00:00.000Z",
            "demo-weekly-sync|2026-10-17T21:00:00.000Z",
            "demo-weekly-sync|2026-10-22T21:00:00.000Z",
        ])
    }
}
