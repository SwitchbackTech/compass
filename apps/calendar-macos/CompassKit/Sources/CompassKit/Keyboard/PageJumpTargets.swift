import Foundation

/// Page-level Mod+digit jump targets (parity with web `page-jump.targets.ts`).
public enum PageJumpTargets {
    public static let dayColumnPrefix = "day-column:"

    public struct Draft: Sendable, Hashable {
        public var id: String
        public var label: String

        public init(id: String, label: String) {
            self.id = id
            self.label = label
        }
    }

    public struct Resolved: Sendable, Hashable, Identifiable {
        public var id: String
        public var digit: String
        public var label: String

        public init(id: String, digit: String, label: String) {
            self.id = id
            self.digit = digit
            self.label = label
        }
    }

    public static func dayColumnJumpId(calendarId: String) -> String {
        "\(dayColumnPrefix)\(calendarId)"
    }

    /// Web `VIEW_SELECT_TARGET`: the view dropdown always comes first.
    static let viewSelect = Draft(id: "view-select", label: "View dropdown")

    /// Web sidebar map: month picker, Up next, then the calendar list (web adds
    /// one target per connected account; macOS keeps a single list slot).
    private static let sidebarDrafts = [
        Draft(id: "month-picker", label: "Month picker"),
        Draft(id: "up-next", label: "Up next"),
        Draft(id: "calendars", label: "Calendar list"),
    ]

    /// Week view (web `buildCalendarPageJumpTargets`): view dropdown, then the sidebar map.
    public static func buildSidebarPageJumpTargets() -> [Resolved] {
        withPickDigits([viewSelect] + sidebarDrafts)
    }

    /// Day view (web `buildDayPageJumpTargets`): view dropdown, each displayed
    /// column left to right, then the sidebar map. When columns consume every
    /// physical key, sidebar targets at the end are omitted first.
    public static func buildDayPageJumpTargets(
        displayedCalendars: [(id: String, name: String)]
    ) -> [Resolved] {
        let columnTargets = displayedCalendars.map { calendar in
            Draft(id: dayColumnJumpId(calendarId: calendar.id), label: calendar.name)
        }
        return withPickDigits([viewSelect] + columnTargets + sidebarDrafts)
    }

    public static func dayColumnJumpDigits(from targets: [Resolved]) -> [String: String] {
        dayColumnJumpDigits(from: targets.map { (id: $0.id, digit: $0.digit) })
    }

    public static func dayColumnJumpDigits(
        from targets: some Sequence<(id: String, digit: String)>
    ) -> [String: String] {
        var map: [String: String] = [:]
        for target in targets {
            guard target.id.hasPrefix(dayColumnPrefix) else { continue }
            map[String(target.id.dropFirst(dayColumnPrefix.count))] = target.digit
        }
        return map
    }

    private static func withPickDigits(_ drafts: [Draft]) -> [Resolved] {
        drafts.prefix(FormFieldDigitMapping.pickKeyLabels.count).enumerated().map {
            index,
            draft in
            Resolved(
                id: draft.id,
                digit: FormFieldDigitMapping.pickKeyLabels[index],
                label: draft.label
            )
        }
    }
}
