import CompassKit
import Foundation

/// Live app state the palette rows depend on. Mirrors the hooks web
/// `CommandPalette.tsx` reads (session, billing, booking, Up Next, undo).
public struct CommandPaletteContext: Sendable {
    public enum MeetingPage: Sendable, Equatable {
        case live(URL)
        case setup
    }

    public var view: CalendarGridView
    public var query: String
    public var now: Date
    public var isSignedIn: Bool
    public var isTrialing: Bool
    public var eventHits: [CommandPaletteEventHit]
    public var recentIds: [String]
    public var tipsMuted: Bool
    public var levelHidden: Bool
    public var theme: CompassThemeName
    public var isSidebarOpen: Bool
    public var hasUpNext: Bool
    public var hasConference: Bool
    public var canUndo: Bool
    public var canRedo: Bool
    public var hasDemoEvents: Bool
    public var timeZoneAbbreviation: String
    public var billingBadge: String?
    public var meetingPage: MeetingPage?

    public init(
        view: CalendarGridView,
        query: String,
        now: Date,
        isSignedIn: Bool = false,
        isTrialing: Bool = false,
        eventHits: [CommandPaletteEventHit] = [],
        recentIds: [String] = [],
        tipsMuted: Bool = false,
        levelHidden: Bool = false,
        theme: CompassThemeName = .default,
        isSidebarOpen: Bool = true,
        hasUpNext: Bool = false,
        hasConference: Bool = false,
        canUndo: Bool = false,
        canRedo: Bool = false,
        hasDemoEvents: Bool = false,
        timeZoneAbbreviation: String = "UTC",
        billingBadge: String? = nil,
        meetingPage: MeetingPage? = nil
    ) {
        self.view = view
        self.query = query
        self.now = now
        self.isSignedIn = isSignedIn
        self.isTrialing = isTrialing
        self.eventHits = eventHits
        self.recentIds = recentIds
        self.tipsMuted = tipsMuted
        self.levelHidden = levelHidden
        self.theme = theme
        self.isSidebarOpen = isSidebarOpen
        self.hasUpNext = hasUpNext
        self.hasConference = hasConference
        self.canUndo = canUndo
        self.canRedo = canRedo
        self.hasDemoEvents = hasDemoEvents
        self.timeZoneAbbreviation = timeZoneAbbreviation
        self.billingBadge = billingBadge
        self.meetingPage = meetingPage
    }
}

/// Builds palette rows in web `CommandPalette.tsx` order: go-to-date, Recent,
/// Navigation, Common Actions, Appearance, Settings, More, then Events.
public enum CommandPaletteCatalog {
    /// Web `PERSONAL_ONBOARDING_URL` in `more.cmd.constants.ts`.
    public static let personalOnboardingURL = URL(string: "https://www.compasscalendar.com/meet/tyler")!
    static let maxRecentItems = 3

    public static func sections(_ context: CommandPaletteContext) -> [CommandPaletteSection] {
        let structural = [
            CommandPaletteSection(id: "navigation", heading: "Navigation", items: navigationItems(context)),
            CommandPaletteSection(id: "general", heading: "Common Actions", items: commonActionItems(context)),
            CommandPaletteSection(id: "appearance", heading: "Appearance", items: [themeItem(context.theme)]),
            CommandPaletteSection(id: "settings", heading: "Settings", items: settingsItems(context)),
            CommandPaletteSection(id: "advanced", heading: "More", items: moreItems()),
        ].filter { !$0.items.isEmpty }

        var built: [CommandPaletteSection] = []
        if let goToDate = goToDateItem(query: context.query, now: context.now) {
            built.append(CommandPaletteSection(id: "go-to-date", heading: "", items: [goToDate]))
        }
        // Web drops Recent while typing so a match never shows twice.
        let isSearching = !context.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let recent = isSearching ? [] : recentItems(recentIds: context.recentIds, from: structural)
        if !recent.isEmpty {
            built.append(CommandPaletteSection(id: "recent", heading: "Recent", items: recent))
        }
        built.append(contentsOf: structural)
        if !context.eventHits.isEmpty {
            built.append(
                CommandPaletteSection(
                    id: "events",
                    heading: "Events",
                    items: context.eventHits.map { hit in
                        CommandPaletteItem(
                            id: "event-\(hit.eventId)",
                            label: hit.label,
                            keywords: [hit.subtitle],
                            subtitle: hit.subtitle,
                            systemImage: "calendar")
                    }))
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
            keywords: [query],
            systemImage: "calendar")
    }

    private static func navigationItems(_ context: CommandPaletteContext) -> [CommandPaletteItem] {
        var items: [CommandPaletteItem] = [
            CommandPaletteItem(
                id: "today",
                label: "Go to Today",
                shortcut: "t",
                keywords: ["now", "current", "jump"],
                systemImage: "arrow.uturn.backward"),
        ]
        let views: [(CalendarGridView, String, String, [String], String)] = [
            (.day, "day", "d", ["day view", "day page", "daily", "calendar"], "calendar.day.timeline.left"),
            (.week, "week", "w", ["week view", "week page", "weekly", "calendar"], "calendar"),
            (.life, "life", "l", ["life view", "life page", "years", "map"], "hourglass"),
        ]
        for (view, name, key, keywords, image) in views where view != context.view {
            items.append(
                CommandPaletteItem(
                    id: "go-to-\(name)",
                    label: "Go to \(name.capitalized)",
                    shortcut: key,
                    keywords: keywords,
                    systemImage: image))
        }
        items.append(contentsOf: [
            CommandPaletteItem(
                id: "show-shortcuts",
                label: "Show shortcuts",
                shortcut: "?",
                keywords: ["keyboard", "keyboard shortcuts", "hotkeys", "keys", "help", "keybindings"],
                systemImage: "keyboard"),
            CommandPaletteItem(
                id: "practice-shortcuts",
                label: "Play Block Party (practice shortcuts)",
                keywords: [
                    "onboarding", "tour", "intro", "help", "tutorial", "coach", "sandbox",
                    "practice", "shortcuts", "game", "play", "block party",
                ],
                systemImage: "safari"),
            CommandPaletteItem(
                id: "show-welcome-guide",
                label: "Show welcome guide",
                keywords: ["onboarding", "tour", "intro", "help", "faq"],
                systemImage: "safari"),
            CommandPaletteItem(
                id: "toggle-shortcut-tips",
                label: context.tipsMuted ? "Show shortcut tips" : "Hide shortcut tips",
                keywords: ["sidebar", "hint", "tips", "teaching", "shortcuts", "keyboard"],
                systemImage: context.tipsMuted ? "eye" : "eye.slash"),
            CommandPaletteItem(
                id: "toggle-shortcut-level",
                label: context.levelHidden ? "Show shortcut level" : "Hide shortcut level",
                keywords: ["level", "progress", "badge", "shortcuts", "keyboard"],
                systemImage: context.levelHidden ? "eye" : "eye.slash"),
            CommandPaletteItem(
                id: "toggle-sidebar",
                label: "Toggle sidebar",
                shortcut: "]",
                keywords: ["panel", "hide sidebar", "show sidebar"],
                systemImage: "sidebar.left"),
            CommandPaletteItem(
                id: "focus-month-picker",
                label: "Focus month picker",
                shortcut: "i",
                keywords: ["sidebar", "dates", "calendar"],
                systemImage: "calendar.day.timeline.left",
                isDisabled: !context.isSidebarOpen),
            CommandPaletteItem(
                id: "open-up-next",
                label: "Open Up Next event",
                shortcut: "n",
                keywords: ["upcoming", "next event"],
                systemImage: "calendar",
                isDisabled: !context.hasUpNext),
            CommandPaletteItem(
                id: "join-up-next-meeting",
                label: "Join meeting",
                shortcut: "v",
                keywords: ["conference", "video", "call", "meet"],
                systemImage: "video",
                isDisabled: !context.hasConference),
        ])
        return items
    }

    private static func recentItems(
        recentIds: [String],
        from sections: [CommandPaletteSection]
    ) -> [CommandPaletteItem] {
        var lookup: [String: CommandPaletteItem] = [:]
        for item in sections.flatMap(\.items) where lookup[item.id] == nil {
            lookup[item.id] = item
        }
        return recentIds.compactMap { id in
            guard let item = lookup[id] else { return nil }
            return CommandPaletteItem(
                id: "recent-" + id,
                label: item.label,
                shortcut: item.shortcut,
                keywords: item.keywords,
                systemImage: item.systemImage,
                badge: item.badge,
                isDisabled: item.isDisabled)
        }
        .prefix(maxRecentItems)
        .map { $0 }
    }

    private static func commonActionItems(_ context: CommandPaletteContext) -> [CommandPaletteItem] {
        var items = [
            CommandPaletteItem(
                id: "create-event",
                label: "Create event",
                shortcut: "c",
                keywords: ["new event", "add event", "schedule"],
                systemImage: "plus"),
            CommandPaletteItem(
                id: "create-allday-event",
                label: "Create all-day event",
                shortcut: "shift+c",
                keywords: ["new event", "add event", "all day"],
                systemImage: "plus"),
        ]
        if context.hasDemoEvents {
            items.append(
                CommandPaletteItem(
                    id: "clear-sample-events",
                    label: "Clear sample events",
                    keywords: ["demo", "sample", "remove"],
                    systemImage: "eraser"))
        }
        items.append(contentsOf: [
            CommandPaletteItem(
                id: "undo-last-change",
                label: "Undo last change",
                shortcut: "mod+z",
                keywords: ["revert", "back", "history"],
                systemImage: "arrow.counterclockwise",
                isDisabled: !context.canUndo),
            CommandPaletteItem(
                id: "redo-last-change",
                label: "Redo last change",
                shortcut: "mod+shift+z",
                keywords: ["forward", "history", "repeat"],
                systemImage: "arrow.clockwise",
                isDisabled: !context.canRedo),
        ])
        return items
    }

    private static func themeItem(_ theme: CompassThemeName) -> CommandPaletteItem {
        let isDark = theme == .darkAbyss
        return CommandPaletteItem(
            id: "toggle-theme",
            label: isDark ? "Switch to light theme" : "Switch to dark theme",
            keywords: ["theme", "dark mode", "light mode", "appearance"],
            systemImage: isDark ? "sun.max" : "moon.stars")
    }

    private static func settingsItems(_ context: CommandPaletteContext) -> [CommandPaletteItem] {
        var items: [CommandPaletteItem] = []
        if context.isTrialing {
            items.append(
                CommandPaletteItem(
                    id: "subscribe-now",
                    label: "Subscribe now",
                    keywords: ["billing", "subscribe", "trial", "pay", "premium", "upgrade", "payment"],
                    systemImage: "creditcard"))
        }
        let tz = context.timeZoneAbbreviation
        items.append(contentsOf: [
            CommandPaletteItem(
                id: "change-default-timezone",
                label: "Change default timezone (\(tz))",
                keywords: ["timezone", "time zone", "tz", tz],
                systemImage: "globe"),
            CommandPaletteItem(
                id: "time-travel",
                label: "Show second timezone",
                shortcut: "z",
                keywords: ["timezone", "time zone", "tz", "secondary"],
                systemImage: "globe"),
        ])
        guard context.isSignedIn else {
            items.append(contentsOf: [
                CommandPaletteItem(
                    id: "sign-up",
                    label: "Start free trial",
                    keywords: ["register", "create account", "sign up", "trial"],
                    systemImage: "person.badge.plus"),
                CommandPaletteItem(
                    id: "log-in",
                    label: "Log In",
                    keywords: ["login", "sign in"],
                    systemImage: "arrow.right.circle"),
            ])
            return items
        }
        items.append(
            CommandPaletteItem(
                id: "show-accounts",
                label: "Manage Accounts",
                shortcut: "mod+,",
                keywords: [
                    "settings", "accounts", "account", "preferences", "options", "add account",
                    "connect google", "connect microsoft", "outlook", "connect apple",
                    "connect calendar", "multiple google", "google accounts", "disconnect account",
                    "remove account", "export data", "delete account",
                ],
                systemImage: "person.2"))
        if let badge = context.billingBadge {
            items.append(contentsOf: [
                CommandPaletteItem(
                    id: "show-billing",
                    label: "Manage Billing",
                    keywords: ["plan", "billing", "subscription", "premium", "trial", "payment", "invoice", "card"],
                    systemImage: "creditcard",
                    badge: badge),
                CommandPaletteItem(
                    id: "update-card",
                    label: "Update card",
                    keywords: ["card", "payment", "billing", "update"],
                    systemImage: "creditcard"),
            ])
        }
        items.append(
            CommandPaletteItem(
                id: "show-booking",
                label: "Meeting settings",
                keywords: ["booking", "availability", "schedule", "meeting link", "settings"],
                systemImage: "calendar"))
        switch context.meetingPage {
        case .live:
            items.append(
                CommandPaletteItem(
                    id: "open-meeting-page",
                    label: "Open meeting page",
                    keywords: ["booking", "meeting link", "public", "share", "meet", "schedule"],
                    systemImage: "arrow.up.right.square"))
        case .setup:
            items.append(
                CommandPaletteItem(
                    id: "setup-meeting-page",
                    label: "Set up meeting page",
                    keywords: ["booking", "availability", "meeting link", "configure", "setup", "share"],
                    systemImage: "calendar.badge.plus"))
        case nil:
            break
        }
        items.append(
            CommandPaletteItem(
                id: "log-out",
                label: "Log Out",
                keywords: ["logout", "sign out"],
                systemImage: "rectangle.portrait.and.arrow.right"))
        return items
    }

    private static func moreItems() -> [CommandPaletteItem] {
        [
            CommandPaletteItem(
                id: "share-feedback",
                label: "Share Feedback",
                keywords: ["bug", "report", "issue", "problem", "suggest", "contact"],
                systemImage: "bubble.left.and.bubble.right"),
            CommandPaletteItem(
                id: "open-settings",
                label: "Settings",
                shortcut: "mod+,",
                keywords: ["preferences", "account", "options"],
                systemImage: "gearshape"),
            CommandPaletteItem(
                id: "book-personal-onboarding",
                label: "Book personal onboarding",
                keywords: ["calendly", "onboarding", "book", "meeting", "call", "demo", "setup"],
                systemImage: "calendar.badge.checkmark"),
            CommandPaletteItem(
                id: "about",
                label: "About Compass",
                keywords: ["version", "info", "social", "twitter", "x", "linkedin", "github", "links"],
                systemImage: "info.circle"),
        ]
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
