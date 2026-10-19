import CompassKit
import Foundation
import XCTest
@testable import CompassData

@MainActor
final class LifeStoreTests: XCTestCase {
    func testSidebarEditsValidateAndPersistWithoutChangingVariation() throws {
        let suite = "LifeStoreTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let today = try XCTUnwrap(LifeMath.parseLifeDate("2026-10-19"))
        let store = LifeStore(defaults: defaults, today: { today })
        XCTAssertTrue(store.updateBirthDate(" 1990-06-15 "))
        XCTAssertEqual(store.preferences.birthDate, "1990-06-15")
        XCTAssertFalse(store.updateBirthDate("2027-01-01"))
        XCTAssertFalse(store.updateBirthDate("1899-12-31"))
        XCTAssertFalse(store.updateBirthDate("2026-02-30"))
        XCTAssertEqual(store.preferences.birthDate, "1990-06-15")
        XCTAssertTrue(store.updateLifespan(200))
        XCTAssertEqual(store.preferences.lifespan, 150)
        XCTAssertTrue(store.updateLifespan(0))
        XCTAssertEqual(store.preferences.lifespan, 1)
        XCTAssertFalse(store.updateLifespan(.nan))
        XCTAssertEqual(store.preferences.variation, .average)
        let reloaded = LifeStore(defaults: defaults, today: { today })
        XCTAssertEqual(reloaded.preferences, store.preferences)
        XCTAssertTrue(store.updateBirthDate(""))
        XCTAssertFalse(store.hasBirthDate)
        XCTAssertEqual(store.summary, "Birth date not set")
    }

    func testRandomBirthDateEditKeepsLifespanAtLeastCurrentAge() throws {
        let suite = "LifeStoreTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let today = try XCTUnwrap(LifeMath.parseLifeDate("2026-10-19"))
        let store = LifeStore(defaults: defaults, today: { today })
        store.shuffleRandomVariation()
        XCTAssertTrue(store.updateBirthDate("1990-01-01"))
        XCTAssertGreaterThanOrEqual(store.preferences.lifespan, 36)
        XCTAssertLessThanOrEqual(store.preferences.lifespan, 100)
        XCTAssertEqual(store.preferences.variation, .random)
    }
}
