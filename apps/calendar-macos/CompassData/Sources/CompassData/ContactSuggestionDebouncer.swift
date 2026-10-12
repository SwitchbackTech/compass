import CompassKit
import Foundation

public actor ContactSuggestionDebouncer {
    public typealias Fetch = @Sendable (String) async -> [DraftAttendeeInput]

    private let debounceMilliseconds: Int
    private let fetch: Fetch
    private var pendingTask: Task<[DraftAttendeeInput], Never>?
    private var generation: UInt = 0
    private var scheduledRawQuery: String = ""

    public init(
        debounceMilliseconds: Int = ContactSuggestionConstants.debounceMilliseconds,
        fetch: @escaping Fetch
    ) {
        self.debounceMilliseconds = debounceMilliseconds
        self.fetch = fetch
    }

    public func cancel() {
        generation &+= 1
        pendingTask?.cancel()
        pendingTask = nil
    }

    public func suggestions(for rawQuery: String) async -> [DraftAttendeeInput] {
        generation &+= 1
        let currentGeneration = generation
        scheduledRawQuery = rawQuery
        pendingTask?.cancel()

        let task = Task { [debounceMilliseconds, fetch, currentGeneration] in
            if debounceMilliseconds > 0 {
                try? await Task.sleep(for: .milliseconds(debounceMilliseconds))
            }
            guard !Task.isCancelled else { return [] as [DraftAttendeeInput] }
            return await self.fetchIfCurrentGeneration(currentGeneration, fetch: fetch)
        }
        pendingTask = task
        let result = await task.value
        guard currentGeneration == generation else { return [] }
        return result
    }

    private func fetchIfCurrentGeneration(_ expectedGeneration: UInt, fetch: Fetch) async -> [DraftAttendeeInput] {
        guard expectedGeneration == generation else { return [] }
        guard let query = trimmedQuery(from: scheduledRawQuery) else { return [] }
        guard expectedGeneration == generation else { return [] }
        return await fetch(query)
    }

    private func trimmedQuery(from raw: String) -> String? {
        let query = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= ContactSuggestionConstants.minQueryLength else { return nil }
        return query
    }
}
