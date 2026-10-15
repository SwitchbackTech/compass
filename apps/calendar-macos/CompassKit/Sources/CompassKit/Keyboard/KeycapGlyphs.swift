import Foundation

/// Mac glyph rendering for registry keycaps (`Mod`, `Shift`, `ArrowUp`, ...) and hotkey strings.
public enum KeycapGlyphs {
    private static let modifiers: [String: String] = [
        "mod": "⌘", "cmd": "⌘", "command": "⌘",
        "shift": "⇧",
        "alt": "⌥", "option": "⌥",
        "ctrl": "⌃", "control": "⌃",
    ]

    private static let keys: [String: String] = [
        "arrowup": "↑", "arrowdown": "↓", "arrowleft": "←", "arrowright": "→",
        "enter": "↩", "return": "↩",
        "escape": "Esc", "esc": "Esc",
        "backspace": "⌫", "delete": "⌦",
        "tab": "⇥",
        "space": "Space",
    ]

    /// Modifiers glue to the key that follows them (`⌘⇧,`); separate keys or sequence steps stay space-separated.
    public static func display(_ keycaps: [String]) -> String {
        var groups: [String] = []
        var pending = ""
        for token in keycaps {
            if let glyph = modifiers[token.lowercased()] {
                pending += glyph
                continue
            }
            groups.append(pending + keyGlyph(token))
            pending = ""
        }
        if !pending.isEmpty { groups.append(pending) }
        return groups.joined(separator: " ")
    }

    /// `Ctrl+Option+Cmd+Space` becomes `⌃⌥⌘Space`.
    public static func displayHotKey(_ raw: String) -> String {
        let tokens = raw.split(separator: "+").map { $0.trimmingCharacters(in: .whitespaces) }
        return display(tokens)
    }

    private static func keyGlyph(_ token: String) -> String {
        if let glyph = keys[token.lowercased()] { return glyph }
        return token.count == 1 ? token.uppercased() : token
    }
}
