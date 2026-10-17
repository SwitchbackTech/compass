import Foundation

/// An unknown or different account must never reuse persisted remote caches.
enum AccountCacheIdentity {
    static let metadataKey = "compass.cache.account-id"

    static func matches(userId: String?, repository: UserMetadataRepository) throws -> Bool {
        guard let userId, !userId.isEmpty,
              let json = try repository.fetch(key: metadataKey),
              let stored = try? JSONDecoder().decode(String.self, from: Data(json.utf8))
        else { return false }
        return stored == userId
    }

    static func record(userId: String?, repository: UserMetadataRepository) throws {
        try repository.upsert(key: metadataKey, value: userId ?? "")
    }
}
