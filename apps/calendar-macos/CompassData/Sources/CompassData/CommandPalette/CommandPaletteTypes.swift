import Foundation

public struct CommandPaletteItem: Identifiable, Hashable, Sendable {
    public let id: String
    public let label: String
    public let shortcut: String?
    public let keywords: [String]
    public let subtitle: String?
    public let systemImage: String?
    /// Web `CommandItem.badge`: a bordered pill before the shortcut.
    public let badge: String?
    /// Web `CommandItem.disabled`: shown dimmed, skipped by arrows, not runnable.
    public let isDisabled: Bool

    public init(
        id: String,
        label: String,
        shortcut: String? = nil,
        keywords: [String] = [],
        subtitle: String? = nil,
        systemImage: String? = nil,
        badge: String? = nil,
        isDisabled: Bool = false
    ) {
        self.id = id
        self.label = label
        self.shortcut = shortcut
        self.keywords = keywords
        self.subtitle = subtitle
        self.systemImage = systemImage
        self.badge = badge
        self.isDisabled = isDisabled
    }
}

public struct CommandPaletteSection: Identifiable, Hashable, Sendable {
    public let id: String
    public let heading: String
    public let items: [CommandPaletteItem]

    public init(id: String, heading: String, items: [CommandPaletteItem]) {
        self.id = id
        self.heading = heading
        self.items = items
    }
}
