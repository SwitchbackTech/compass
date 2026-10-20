import CompassKit
import SwiftUI

/// Web `OverlayPanelActionButton`: `h-11 px-4 rounded text-sm`, with the
/// action's keycaps after the label. Callers still attach `.keyboardShortcut`.
struct OverlayPanelActionButton: View {
    enum Variant {
        case primary
        case secondary
        case destructive
        case ghost
    }

    @Environment(\.nativeWebTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @State private var isHovered = false
    let title: String
    var variant: Variant = .secondary
    /// Registry-style keycaps, e.g. `["Enter"]` or `["Mod", "Enter"]`.
    var shortcut: [String] = []
    let action: () -> Void

    init(
        _ title: String,
        variant: Variant = .secondary,
        shortcut: [String] = [],
        action: @escaping () -> Void
    ) {
        self.title = title
        self.variant = variant
        self.shortcut = shortcut
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 0) {
                Text(title)
                    .font(.rubik(14, weight: variant == .primary ? .medium : .regular))
                    .underline(variant == .ghost && isHovered)
                if !shortcut.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(Array(shortcut.enumerated()), id: \.offset) { _, key in
                            ShortcutHintChip(label: KeycapGlyphs.display([key]))
                        }
                    }
                    .padding(.leading, 8)
                }
            }
            .foregroundStyle(foreground)
            .padding(.horizontal, variant == .ghost ? 0 : 16)
            .frame(height: variant == .ghost ? nil : 44)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .overlay {
                if variant == .secondary {
                    RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                        .stroke(theme.borderColor, lineWidth: 1)
                }
            }
            .brightness(isHovered && (variant == .primary || variant == .destructive) ? 0.06 : 0)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        // Keycaps are visual; the button is named by its title alone.
        .accessibilityLabel(title)
        .opacity(isEnabled ? 1 : 0.5)
        .onHover { isHovered = $0 }
    }

    private var foreground: Color {
        switch variant {
        case .primary, .destructive: theme.onAccentColor
        case .secondary: theme.textColor
        case .ghost: isHovered ? theme.textColor : theme.textMutedColor
        }
    }

    private var background: Color {
        switch variant {
        case .primary: theme.accentColor
        case .destructive: theme.errorColor
        case .secondary: isHovered ? theme.surfacePanelColor : theme.surfaceOverlayColor
        case .ghost: .clear
        }
    }
}
