import CompassKit
import Foundation

public struct CommandPaletteItem: Identifiable, Hashable, Sendable {
    public let id: String
    public let label: String
    public let shortcut: String?
    public let keywords: [String]
    public let subtitle: String?
    public let icon: PhosphorIcon?

    public init(
        id: String,
        label: String,
        shortcut: String? = nil,
        keywords: [String] = [],
        subtitle: String? = nil,
        icon: PhosphorIcon? = nil
    ) {
        self.id = id
        self.label = label
        self.shortcut = shortcut
        self.keywords = keywords
        self.subtitle = subtitle
        self.icon = icon
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
