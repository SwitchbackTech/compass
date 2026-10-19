import SwiftUI

extension View {
    /// Web `c-focus-ring`: 1px accent stroke with a 1px surface-panel offset.
    func nativeWebFocusRing(_ isFocused: Bool, cornerRadius: CGFloat = 4) -> some View {
        modifier(NativeWebFocusRing(isFocused: isFocused, cornerRadius: cornerRadius))
    }
}

private struct NativeWebFocusRing: ViewModifier {
    @Environment(\.nativeWebTheme) private var theme
    let isFocused: Bool
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(isFocused ? 1 : 0)
            .background {
                if isFocused {
                    RoundedRectangle(cornerRadius: cornerRadius + 1)
                        .fill(theme.surfacePanelColor)
                }
            }
            .overlay {
                if isFocused {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(theme.accentColor, lineWidth: 1)
                        .padding(1)
                }
            }
    }
}
