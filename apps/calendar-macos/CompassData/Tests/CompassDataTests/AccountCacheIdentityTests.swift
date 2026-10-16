@testable import CompassData
import XCTest

final class AccountCacheIdentityTests: XCTestCase {
    func testOnlyAKnownMatchingAccountMayReuseTheCache() throws {
        let repository = UserMetadataRepository(database: try AppDatabase.inMemory())
        XCTAssertFalse(try AccountCacheIdentity.matches(userId: "account-a", repository: repository))
        try AccountCacheIdentity.record(userId: "account-a", repository: repository)
        XCTAssertTrue(try AccountCacheIdentity.matches(userId: "account-a", repository: repository))
        XCTAssertFalse(try AccountCacheIdentity.matches(userId: "account-b", repository: repository))
        XCTAssertFalse(try AccountCacheIdentity.matches(userId: nil, repository: repository))
        try AccountCacheIdentity.record(userId: "account-b", repository: repository)
        XCTAssertFalse(try AccountCacheIdentity.matches(userId: "account-a", repository: repository))
        XCTAssertTrue(try AccountCacheIdentity.matches(userId: "account-b", repository: repository))
        try repository.upsert(key: AccountCacheIdentity.metadataKey, value: ["unexpected": true])
        XCTAssertFalse(try AccountCacheIdentity.matches(userId: "account-b", repository: repository))
    }
}
