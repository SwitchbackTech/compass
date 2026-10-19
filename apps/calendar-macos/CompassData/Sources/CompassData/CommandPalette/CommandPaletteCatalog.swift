import CompassKit
import Foundation

/// Builds palette rows for navigation, events, and more actions.
public enum CommandPaletteCatalog {
    public static func sections(
        view: CalendarGridView,
        query: String,
        now: Date,
        isSignedIn: Bool,
        isTrialing: Bool,
        eventHits: [CommandPaletteEventHit],
        recentIds: [String]
    ) -> [CommandPaletteSection] {
        var built: [CommandPaletteSection] = []

        if let goToDate = goToDateItem(query: query, now: now) {
            built.append(CommandPaletteSection(id: "go-to-date", heading: "", items: [goToDate]))
        }

        let navigation = navigationItems(view: view)
        if !navigation.isEmpty {
            built.append(CommandPaletteSection(id: "navigation", heading: "Navigation", items: navigation))
        }

        if !eventHits.isEmpty {
            built.append(
                CommandPaletteSection(
                    id: "events",
                    heading: "Events",
                    items: eventHits.map { hit in
                        CommandPaletteItem(
                            id: "event-\(hit.eventId)",
                            label: hit.label,
                            keywords: [hit.subtitle],
                            subtitle: hit.subtitle)
                    }))
        }

        let recent = recentItems(recentIds: recentIds, navigation: navigation)
        if !recent.isEmpty {
            built.append(CommandPaletteSection(id: "recent", heading: "Recent", items: recent))
        }

        built.append(contentsOf: eventActionSections())
        built.append(contentsOf: moreSections(isTrialing: isTrialing))

        var accountItems = [CommandPaletteItem(
            id: "export-data",
            label: "Export data",
            keywords: ["download", "backup", "local events"])]
        if isSignedIn {
            accountItems.append(CommandPaletteItem(
                id: "log-out",
                label: "Log out",
                keywords: ["sign out"]))
        }
        built.append(CommandPaletteSection(id: "account-actions", heading: "Account", items: accountItems))

        if !isSignedIn {
            built.append(
                CommandPaletteSection(
                    id: "auth",
                    heading: "Account",
                    items: [
                        CommandPaletteItem(
                            id: "sign-up",
                            label: "Sign Up",
                            keywords: ["register", "create account"]),
                        CommandPaletteItem(
                            id: "log-in",
                            label: "Log In",
                            keywords: ["sign in"]),
                    ]))
        }

        return built
    }

    private static func goToDateItem(
        query: String,
        now: Date
    ) -> CommandPaletteItem? {
        guard let date = UserDateParsing.parseUserDate(query, now: now) else { return nil }
        return CommandPaletteItem(
            id: "go-to-date",
            label: UserDateParsing.goToDatePaletteLabel(date),
            keywords: [query])
    }

    private static func navigationItems(
        view: CalendarGridView
    ) -> [CommandPaletteItem] {
        var items: [CommandPaletteItem] = [
            CommandPaletteItem(
                id: "today",
                label: "Go to Today",
                shortcut: "t",
                keywords: ["now", "current", "jump"]),
        ]
        if view != .day {
            items.append(
                CommandPaletteItem(
                    id: "go-to-day",
                    label: "Go to Day view",
                    shortcut: "d",
                    keywords: ["day view", "daily"]))
        }
        if view != .week {
            items.append(
                CommandPaletteItem(
                    id: "go-to-week",
                    label: "Go to Week view",
                    shortcut: "w",
                    keywords: ["week view", "weekly"]))
        }
        if view != .life {
            items.append(
                CommandPaletteItem(
                    id: "go-to-life",
                    label: "Go to Life view",
                    shortcut: "l",
                    keywords: ["life view", "years"]))
        }
        items.append(
            CommandPaletteItem(
                id: "show-shortcuts",
                label: "Show shortcuts",
                shortcut: "?",
                keywords: ["keyboard", "legend", "help"]))
        return items
    }

    private static func recentItems(
        recentIds: [String],
        navigation: [CommandPaletteItem]
    ) -> [CommandPaletteItem] {
        let lookup = Dictionary(uniqueKeysWithValues: navigation.map { ($0.id, $0) })
        return recentIds.compactMap { id in
            guard let item = lookup[id] else { return nil }
            return CommandPaletteItem(
                id: "recent-" + id,
                label: item.label,
                shortcut: item.shortcut,
                keywords: item.keywords)
        }
    }

    private static func eventActionSections() -> [CommandPaletteSection] {
        [
            CommandPaletteSection(
                id: "create",
                heading: "Create",
                items: [
                    CommandPaletteItem(
                        id: "create-event",
                        label: "Create event",
                        shortcut: "c",
                        keywords: ["new event", "schedule"]),
                    CommandPaletteItem(
                        id: "create-allday-event",
                        label: "Create all-day event",
                        shortcut: "shift+c",
                        keywords: ["all day"]),
                ]),
        ]
    }

    private static func moreSections(
        isTrialing: Bool
    ) -> [CommandPaletteSection] {
        var items: [CommandPaletteItem] = [
            CommandPaletteItem(
                id: "undo",
                label: "Undo",
                shortcut: "mod+z",
                keywords: ["revert", "back"]),
            CommandPaletteItem(
                id: "redo",
                label: "Redo",
                shortcut: "mod+shift+z",
                keywords: ["repeat", "forward"]),
            CommandPaletteItem(
                id: "show-welcome-guide",
                label: "Show welcome guide",
                keywords: ["onboarding", "tour", "intro", "help", "faq"]),
            CommandPaletteItem(
                id: "practice-shortcuts",
                label: "Play Block Party (practice shortcuts)",
                keywords: [
                    "onboarding", "tour", "intro", "help", "tutorial", "coach", "sandbox",
                    "practice", "shortcuts", "game", "play", "block party",
                ]),
            CommandPaletteItem(
                id: "open-settings",
                label: "Settings",
                shortcut: ",",
                keywords: ["preferences", "account"]),
            CommandPaletteItem(
                id: "about",
                label: "About Compass",
                keywords: ["version", "info"]),
        ]
        if isTrialing {
            items.insert(
                CommandPaletteItem(
                    id: "subscribe",
                    label: "Subscribe now",
                    shortcut: "b",
                    keywords: ["billing", "upgrade"]),
                at: 0)
        }
        return [CommandPaletteSection(id: "advanced", heading: "More", items: items)]
    }
}

public struct CommandPaletteEventHit: Hashable, Sendable {
    public let eventId: String
    public let label: String
    public let subtitle: String

    public init(eventId: String, label: String, subtitle: String) {
        self.eventId = eventId
        self.label = label
        self.subtitle = subtitle
    }
}
