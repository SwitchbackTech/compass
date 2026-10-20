import SwiftUI

/// Web `OverlayPanel` message: `text-base text-text`, wrapping.
struct ModalDialogMessage: View {
    @Environment(\.nativeWebTheme) private var theme
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(.rubik(16))
            .foregroundStyle(theme.textColor)
            .fixedSize(horizontal: false, vertical: true)
    }
}
