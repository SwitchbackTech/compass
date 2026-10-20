import SwiftUI

public struct ShortcutHintChip: View {
    public enum Style {
        case standard
        /// Web keycaps on accent-filled buttons (Up Next join/open).
        case onAccent
    }

    public let label: String
    public let style: Style

    public init(label: String, style: Style = .standard) {
        self.label = label
        self.style = style
    }

    @Environment(\.nativeWebTheme) private var theme

    public var body: some View {
        Text(label)
            .font(.rubik(11, weight: .medium))
            .foregroundStyle(foreground)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .frame(minHeight: 18)
            .background(background)
            .overlay {
                RoundedRectangle(cornerRadius: 4)
                    .stroke(border, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var foreground: Color {
        switch style {
        case .standard: theme.textColor
        case .onAccent: theme.onAccentColor
        }
    }

    private var background: Color {
        switch style {
        case .standard: theme.surfacePanelColor
        case .onAccent: theme.onAccentColor.opacity(0.1)
        }
    }

    private var border: Color {
        switch style {
        case .standard: theme.borderColor
        case .onAccent: theme.onAccentColor.opacity(0.35)
        }
    }
}
