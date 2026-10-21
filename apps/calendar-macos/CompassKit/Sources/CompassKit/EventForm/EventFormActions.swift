import Foundation

/// Mirrors `@core/shortcuts/event-form-actions.ts` for native command palette rows.
public enum EventFormActions {
    public struct Entry: Hashable, Sendable {
        public let id: String
        public let label: String
        public let keycaps: [String]

        public init(id: String, label: String, keycaps: [String]) {
            self.id = id
            self.label = label
            self.keycaps = keycaps
        }
    }

    public struct Options: Sendable {
        public var hasMeetingLink: Bool
        public var isExistingEvent: Bool
        public var isReadOnly: Bool
        public var showBookingFormActions: Bool

        public init(
            hasMeetingLink: Bool,
            isExistingEvent: Bool,
            isReadOnly: Bool,
            showBookingFormActions: Bool
        ) {
            self.hasMeetingLink = hasMeetingLink
            self.isExistingEvent = isExistingEvent
            self.isReadOnly = isReadOnly
            self.showBookingFormActions = showBookingFormActions
        }
    }

    public static func list(registry: ShortcutRegistry, options: Options) -> [Entry] {
        var rows: [Entry] = [
            registryEntry(registry, id: "edit-save", shortcutId: .editSave),
            registryEntry(registry, id: "edit-form-actions", shortcutId: .editFormActions),
        ]

        if options.hasMeetingLink {
            rows.append(registryEntry(registry, id: "edit-copy-meeting-link", shortcutId: .editCopyMeetingLink))
        }

        if options.isExistingEvent, !options.isReadOnly {
            rows.append(registryEntry(registry, id: "edit-duplicate", shortcutId: .editDuplicate))
        }

        if !options.isReadOnly {
            rows.append(registryEntry(registry, id: "edit-delete", shortcutId: .editDelete))
        }

        if options.showBookingFormActions {
            rows.append(registryEntry(registry, id: "edit-cancel-meeting", shortcutId: .editCancelMeeting))
            rows.append(registryEntry(registry, id: "edit-reschedule-meeting", shortcutId: .editRescheduleMeeting))
        }

        rows.append(
            Entry(
                id: "edit-close-form",
                label: "Close form",
                keycaps: keycaps(registry, id: .createPlaceDiscard)))
        return rows
    }

    public static func paletteCommandId(for entryId: String) -> String {
        "event-form-\(entryId)"
    }

    public static func paletteShortcutString(for keycaps: [String]) -> String {
        keycaps.map { cap in
            cap == "Mod" ? "mod" : cap.lowercased()
        }.joined(separator: "+")
    }

    private static func registryEntry(
        _ registry: ShortcutRegistry,
        id: String,
        shortcutId: ShortcutId
    ) -> Entry {
        Entry(
            id: id,
            label: registry.entries.first { $0.id == shortcutId }?.label ?? id,
            keycaps: keycaps(registry, id: shortcutId))
    }

    private static func keycaps(_ registry: ShortcutRegistry, id: ShortcutId) -> [String] {
        registry.entries.first { $0.id == id }?.displayKeycaps ?? []
    }
}
