import CompassKit
import SwiftUI

/// Web `c-button-compact c-button-primary rounded-xs`: accent fill, on-accent
/// text, hover darkens to `accent-hover`.
struct CompactPrimaryButtonStyle: ButtonStyle {
    @Environment(\.nativeWebTheme) private var theme
    @State private var isHovered = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.rubik(11, weight: .medium))
            .foregroundStyle(theme.onAccentColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(isHovered || configuration.isPressed ? theme.accentHoverColor : theme.accentColor)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .onHover { isHovered = $0 }
    }
}
