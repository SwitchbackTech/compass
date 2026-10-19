import CompassKit
import SwiftUI

/// Web `FormCard`: grouped fields on `surface-overlay` with default radius.
struct EventFormCard<Content: View>: View {
    @Environment(\.nativeWebTheme) private var theme
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
    }
}
