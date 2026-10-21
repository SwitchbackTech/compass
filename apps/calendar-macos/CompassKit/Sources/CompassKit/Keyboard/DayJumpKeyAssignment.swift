import Foundation

/// Mirrors web `assign-shift-hint-keys.ts`: day-prefix event jump labels.
public enum DayJumpKeyAssignment {
    public struct Target: Sendable, Equatable {
        public var eventId: String
        public var startMs: Int64
        public var eventType: EventKind
        public var dayKey: String
        public var weekday: Int

        public enum EventKind: Sendable, Equatable {
            case allDay
            case timed
        }

        public init(
            eventId: String,
            startMs: Int64,
            eventType: EventKind,
            dayKey: String,
            weekday: Int
        ) {
            self.eventId = eventId
            self.startMs = startMs
            self.eventType = eventType
            self.dayKey = dayKey
            self.weekday = weekday
        }
    }

    public struct Assignment: Sendable, Equatable {
        public var eventId: String
        public var hint: String
        public var dayKey: String
        public var dayPrefix: String
        public var index: Int
    }

    public enum MatchResult: Sendable, Equatable {
        case selectDay(dayPrefix: String, dayKey: String, firstEventId: String?, buffer: String)
        case prefix(buffer: String, dayKeys: [String], pendingExactEventId: String?)
        case focus(eventId: String, dayKey: String, buffer: String)
    }

    private static let uniqueDayLetters: Set<Character> = ["m", "t", "w", "r", "f"]

    public static func assign(_ targets: [Target]) -> [Assignment] {
        guard !targets.isEmpty else { return [] }
        var byDay: [String: [Target]] = [:]
        for target in targets {
            byDay[target.dayKey, default: []].append(target)
        }
        var assignments: [Assignment] = []
        for dayKey in byDay.keys.sorted() {
            guard var dayTargets = byDay[dayKey] else { continue }
            dayTargets.sort { a, b in
                if a.dayKey != b.dayKey { return a.dayKey < b.dayKey }
                if a.startMs != b.startMs { return a.startMs < b.startMs }
                if a.eventType != b.eventType {
                    return a.eventType == .allDay
                }
                return a.eventId < b.eventId
            }
            let weekday = dayTargets[0].weekday
            let dayPrefix = DayJumpPrefixes.prefix(forWeekday: weekday)
            for (index, target) in dayTargets.enumerated() {
                let n = index + 1
                assignments.append(
                    Assignment(
                        eventId: target.eventId,
                        hint: "\(dayPrefix)\(n)",
                        dayKey: dayKey,
                        dayPrefix: dayPrefix,
                        index: n
                    )
                )
            }
        }
        return assignments
    }

    public static func filter(_ assignments: [Assignment], prefix: String) -> [Assignment] {
        guard !prefix.isEmpty else { return assignments }
        return assignments.filter { $0.hint.hasPrefix(prefix) }
    }

    public static func matchKeystroke(
        assignments: [Assignment],
        dayKeyByPrefix: [String: String],
        key: Character,
        buffer: String
    ) -> MatchResult? {
        let lower = String(key).lowercased()
        guard lower.count == 1, let char = lower.first else { return nil }

        if char.isNumber {
            if buffer.isEmpty { return nil }
            if buffer == "s" { return nil }
            return matchDigitBuffer(assignments: assignments, next: buffer + String(char))
        }

        guard char.isLetter else { return nil }

        if buffer == "s", char == "u" || char == "a" {
            return selectDay(
                assignments: assignments,
                dayKeyByPrefix: dayKeyByPrefix,
                dayPrefix: char == "u" ? "su" : "sa"
            )
        }

        if char == "s" {
            var dayKeys = Set(filter(assignments, prefix: "s").map(\.dayKey))
            for prefix in ["su", "sa"] {
                if let key = dayKeyByPrefix[prefix] {
                    dayKeys.insert(key)
                }
            }
            if dayKeys.isEmpty { return nil }
            return .prefix(buffer: "s", dayKeys: dayKeys.sorted(), pendingExactEventId: nil)
        }

        if uniqueDayLetters.contains(char) {
            return selectDay(
                assignments: assignments,
                dayKeyByPrefix: dayKeyByPrefix,
                dayPrefix: String(char)
            )
        }

        return nil
    }

    private static func selectDay(
        assignments: [Assignment],
        dayKeyByPrefix: [String: String],
        dayPrefix: String
    ) -> MatchResult? {
        let forDay = assignments.filter { $0.dayPrefix == dayPrefix }
        let first = forDay.min(by: { $0.index < $1.index })
        guard let dayKey = first?.dayKey ?? dayKeyByPrefix[dayPrefix] else { return nil }
        return .selectDay(
            dayPrefix: dayPrefix,
            dayKey: dayKey,
            firstEventId: first?.eventId,
            buffer: dayPrefix
        )
    }

    private static func matchDigitBuffer(assignments: [Assignment], next: String) -> MatchResult? {
        let narrowed = filter(assignments, prefix: next)
        if narrowed.isEmpty { return nil }

        let exact = narrowed.first(where: { $0.hint == next })
        let hasLonger = narrowed.contains(where: { $0.hint.count > next.count })

        if let exact, !hasLonger {
            return .focus(eventId: exact.eventId, dayKey: exact.dayKey, buffer: next)
        }

        let dayKeys = Array(Set(narrowed.map(\.dayKey))).sorted()
        return .prefix(
            buffer: next,
            dayKeys: dayKeys,
            pendingExactEventId: exact?.eventId
        )
    }
}
