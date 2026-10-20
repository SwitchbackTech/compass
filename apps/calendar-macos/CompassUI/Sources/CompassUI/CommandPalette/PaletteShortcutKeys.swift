import CompassKit
import SwiftUI

/// One keycap chip per shortcut token, matching web `ShortcutKeys`.
struct PaletteShortcutKeys: View {
    let shortcut: String

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(tokens.enumerated()), id: \.offset) { _, token in
                ShortcutHintChip(label: KeycapGlyphs.display([token]))
            }
        }
    }

    private var tokens: [String] {
        let normalized = shortcut
            .replacingOccurrences(of: "mod+", with: "Mod+")
            .replacingOccurrences(of: "shift+", with: "Shift+")
            .replacingOccurrences(of: "alt+", with: "Alt+")
        return normalized.split(separator: "+").map { part -> String in
            let token = String(part)
            switch token.lowercased() {
            case "mod": return "Mod"
            case "shift": return "Shift"
            case "alt": return "Alt"
            default:
                return token.count == 1 ? token.uppercased() : token
            }
        }
    }
}
