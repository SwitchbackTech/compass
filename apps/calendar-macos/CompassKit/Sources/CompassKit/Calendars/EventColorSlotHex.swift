import Foundation

/// Web `EVENT_COLOR_SLOT_HEX`: the fill for each Google color slot.
public enum EventColorSlotHex {
    public static func hex(for slot: ColorEnum) -> String {
        switch slot {
        case .lavender: "#7986CB"
        case .mint: "#33B679"
        case .plum: "#8E24AA"
        case .coral: "#E67C73"
        case .gold: "#F6BF26"
        case .orange: "#F4511E"
        case .blue: "#039BE5"
        case .slate: "#616161"
        case .indigo: "#3F51B5"
        case .green: "#0B8043"
        case .red: "#D50000"
        }
    }

    /// Web `resolveEventPalette` precedence: a provider `colorHex`, then the slot.
    public static func eventColorHex(for event: Event) -> String? {
        guard case .details(let details) = event.content else { return nil }
        if let colorHex = details.colorHex, !colorHex.isEmpty {
            return colorHex
        }
        return details.color.map(hex(for:))
    }
}

public extension EventColorSlot {
    /// Web `EventColorSlotSchema` order. The generated enum is alphabetical,
    /// so swatches and their pick keys follow this list instead.
    static let webOrder: [EventColorSlot] = [
        .lavender, .mint, .plum, .coral, .gold, .orange, .blue, .slate, .indigo, .green, .red,
    ]
}
