import SwiftUI

extension View {
    /// Ring around a banner that holds keyboard focus from `p`.
    func noticeFocusRing(_ isFocused: Bool) -> some View {
        modifier(NoticeFocusRing(isFocused: isFocused))
    }
}

private struct NoticeFocusRing: ViewModifier {
    @Environment(\.nativeWebTheme) private var theme
    let isFocused: Bool

    func body(content: Content) -> some View {
        content.overlay {
            if isFocused {
                Rectangle()
                    .stroke(theme.accentColor, lineWidth: 2)
                    .allowsHitTesting(false)
            }
        }
    }
}
