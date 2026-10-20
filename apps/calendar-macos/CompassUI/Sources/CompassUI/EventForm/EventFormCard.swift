import CompassKit
import SwiftUI

/// Web `FormCard`: grouped fields on `surface-overlay`, `rounded-md p-3`.
struct EventFormCard<Content: View>: View {
    @Environment(\.nativeWebTheme) private var theme
    var highlighted = false
    @ViewBuilder var content: () -> Content
    /// Tailwind `rounded-md`.
    private var cornerRadius: CGFloat { 6 }

    var body: some View {
        content()
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay {
                if highlighted {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(theme.accentColor, lineWidth: 1)
                }
            }
    }
}
