import CompassKit
import SwiftUI

/// Web `FormCard`: grouped fields on `surface-overlay` with default radius.
struct EventFormCard<Content: View>: View {
    @Environment(\.nativeWebTheme) private var theme
    var highlighted = false
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .overlay {
                if highlighted {
                    RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                        .stroke(theme.accentColor, lineWidth: 1)
                }
            }
    }
}
