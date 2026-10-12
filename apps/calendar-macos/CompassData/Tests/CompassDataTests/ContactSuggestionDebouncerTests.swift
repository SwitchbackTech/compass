@testable import CompassData
import CompassKit
import XCTest

final class ContactSuggestionDebouncerTests: XCTestCase {
    func testDebounceCoalescesRapidQueries() async {
        let calls = CallCounter()
        let debouncer = ContactSuggestionDebouncer(debounceMilliseconds: 200) { query in
            await calls.record(query)
            return [DraftAttendeeInput(email: "\(query)@example.com", displayName: nil)]
        }

        // Enqueue "ad" before "ada". Unordered async let child tasks can enter the
        // actor out of call order and cancel the newer debounce with a stale query.
        let first = Task { await debouncer.suggestions(for: "ad") }
        await Task.yield()
        let second = Task { await debouncer.suggestions(for: "ada") }
        _ = await (first.value, second.value)

        let recorded = await calls.queries
        XCTAssertEqual(recorded, ["ada"])
    }

    func testShortQueryReturnsEmptyWithoutFetch() async {
        let calls = CallCounter()
        let debouncer = ContactSuggestionDebouncer(debounceMilliseconds: 0) { query in
            await calls.record(query)
            return []
        }

        let result = await debouncer.suggestions(for: "a")
        XCTAssertTrue(result.isEmpty)
        let recorded = await calls.queries
        XCTAssertTrue(recorded.isEmpty)
    }
}

private actor CallCounter {
    private(set) var queries: [String] = []

    func record(_ query: String) {
        queries.append(query)
    }
}
