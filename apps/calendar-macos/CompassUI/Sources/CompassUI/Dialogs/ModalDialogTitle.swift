import SwiftUI

/// The headline every native confirm dialog puts above its body. Web
/// `OverlayPanel` title: `font-semibold text-lg`.
struct ModalDialogTitle: View {
    @Environment(\.nativeWebTheme) private var theme
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(.rubik(18, weight: .semibold))
            .foregroundStyle(theme.textColor)
    }
}
