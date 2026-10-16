import Foundation

/// A portable snapshot of user-created events stored on this Mac.
public struct LocalDataExport: Encodable, Sendable {
    public let version = 1
    public let exportedAt: Date
    public let about = "Compass events stored on this Mac. Sample events and synced calendar caches are excluded."
    public let events: [LocalEventRecord]

    public init(records: [LocalEventRecord], exportedAt: Date) {
        self.exportedAt = exportedAt
        events = records.filter { !$0.isDemo }.sorted { $0.id.rawValue < $1.id.rawValue }
    }

    public func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(self)
    }

    public func filename(in timeZone: TimeZone = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return "compass-export-\(formatter.string(from: exportedAt)).json"
    }
}
