import Foundation

public struct CommandPaletteItem: Identifiable, Hashable, Sendable {
    public let id: String
    public let sectionId: String
    public let sectionHeading: String
    public let label: String
    public let shortcut: String?
    public let keywords: [String]
    public let subtitle: String?

    public init(
        id: String,
        sectionId: String,
        sectionHeading: String,
        label: String,
        shortcut: String? = nil,
        keywords: [String] = [],
        subtitle: String? = nil
    ) {
        self.id = id
        self.sectionId = sectionId
        self.sectionHeading = sectionHeading
        self.label = label
        self.shortcut = shortcut
        self.keywords = keywords
        self.subtitle = subtitle
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
