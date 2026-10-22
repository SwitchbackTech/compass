import Foundation

/// Day-prefix event jump labels (web `assign-shift-hint-keys.ts`): the day's
/// prefix plus a per-day chronological index (W1, SU2, F10). Digits only
/// follow a typed day, so a bare digit stays free for quick-time create.
public enum DayJumpKeys {
    public struct Target: Sendable {
        public var eventId: String
        public var start: Date
        public var isAllDay: Bool
        /// YYYY-MM-DD column date.
        public var dayKey: String
        /// 0 = Sunday ... 6 = Saturday.
        public var weekday: Int

        public init(eventId: String, start: Date, isAllDay: Bool, dayKey: String, weekday: Int) {
            self.eventId = eventId
            self.start = start
            self.isAllDay = isAllDay
            self.dayKey = dayKey
            self.weekday = weekday
        }
    }

    public struct Assignment: Hashable, Sendable {
        public var eventId: String
        /// Lowercase chip text, e.g. "w4".
        public var hint: String
        public var dayKey: String
        public var dayPrefix: String
        /// 1-based index within the day.
        public var index: Int
    }

    public enum DigitMatch: Equatable, Sendable {
        /// The buffer names exactly one event and no longer hint shares it.
        case focus(eventId: String, buffer: String)
        /// More digits could follow (F1 vs F10). `exactEventId` is what F1
        /// would focus once the wait for another digit runs out.
        case prefix(buffer: String, exactEventId: String?)
        case none
    }

    public enum KeystrokeMatch: Equatable, Sendable {
        case selectDay(dayPrefix: String, dayKey: String, firstEventId: String?, buffer: String)
        case prefix(buffer: String, pendingExactEventId: String?)
        case focus(eventId: String, buffer: String)
    }

    private static let uniqueDayLetters: Set<Character> = ["m", "t", "w", "r", "f"]

    /// Web `DIGIT_AMBIGUOUS_COMMIT_MS`.
    public static let ambiguousCommitDelay: Duration = .milliseconds(400)
    /// Web column time burst window (`DIGIT_AMBIGUOUS_COMMIT_MS * 2`).
    public static let typedTimeWindow: TimeInterval = 0.8

    /// Same targets, same keys: by day, then start, all-day first, then id.
    public static func assign(_ targets: [Target]) -> [Assignment] {
        let byDay = Dictionary(grouping: targets, by: \.dayKey)
        return byDay.keys.sorted().flatMap { dayKey -> [Assignment] in
            let sorted = (byDay[dayKey] ?? []).sorted { a, b in
                if a.start != b.start { return a.start < b.start }
                if a.isAllDay != b.isAllDay { return a.isAllDay }
                return a.eventId < b.eventId
            }
            let dayPrefix = DayJumpPrefixes.prefix(forWeekday: sorted.first?.weekday ?? 0)
            return sorted.enumerated().map { offset, target in
                Assignment(
                    eventId: target.eventId,
                    hint: "\(dayPrefix)\(offset + 1)",
                    dayKey: dayKey,
                    dayPrefix: dayPrefix,
                    index: offset + 1
                )
            }
        }
    }

    public static func filter(_ assignments: [Assignment], prefix: String) -> [Assignment] {
        prefix.isEmpty ? assignments : assignments.filter { $0.hint.hasPrefix(prefix) }
    }

    /// Web `matchDigitBuffer`: `next` is the day buffer plus the typed digit.
    public static func matchDigit(_ assignments: [Assignment], next: String) -> DigitMatch {
        let narrowed = filter(assignments, prefix: next)
        guard !narrowed.isEmpty else { return .none }
        let exact = narrowed.first { $0.hint == next }
        let hasLonger = narrowed.contains { $0.hint.count > next.count }
        if let exact, !hasLonger {
            return .focus(eventId: exact.eventId, buffer: next)
        }
        return .prefix(buffer: next, exactEventId: exact?.eventId)
    }

    /// Web `matchDayJumpKeystroke`: accepts uppercase letters as aliases.
    public static func matchKeystroke(
        assignments: [Assignment],
        dayKeyByPrefix: [String: String],
        key: Character,
        buffer: String
    ) -> KeystrokeMatch? {
        let lower = String(key).lowercased()
        guard lower.count == 1, let char = lower.first else { return nil }

        if char.isNumber {
            if buffer.isEmpty || buffer == "s" { return nil }
            switch matchDigit(assignments, next: buffer + String(char)) {
            case let .focus(eventId, next):
                return .focus(eventId: eventId, buffer: next)
            case let .prefix(next, exactEventId):
                return .prefix(buffer: next, pendingExactEventId: exactEventId)
            case .none:
                return nil
            }
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
            return .prefix(buffer: "s", pendingExactEventId: nil)
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
    ) -> KeystrokeMatch? {
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
}
