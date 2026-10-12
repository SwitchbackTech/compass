import SwiftUI

/// The chrome every native confirm dialog repeats: the backdrop that covers
/// the window behind it, and the panel's padding, surface, corner, and
/// accessibility identifier.
///
/// Shared because a dialog that spells its own chrome drifts from its
/// neighbours one modifier at a time. Width and identifier are the only parts
/// a caller is meant to vary besides its content.
struct ModalDialogChrome: ViewModifier {
    @Environment(\.nativeWebTheme) private var theme
    let maxWidth: CGFloat
    let identifier: String

    func body(content: Content) -> some View {
        ZStack {
            theme.panelBackdropColor
                .ignoresSafeArea()
            content
                .padding(OverlayPanelChrome.padding)
                .frame(maxWidth: maxWidth)
                .overlayPanelChrome()
                .accessibilityIdentifier(identifier)
        }
    }
}

/// Web `OverlayPanel`'s modal panel: `bg-surface-panel`, `rounded-xl`, a soft
/// shadow, and no border. Callers pad with `OverlayPanelChrome.padding` (`p-8`).
struct OverlayPanelChrome: ViewModifier {
    static let padding: CGFloat = 32
    @Environment(\.nativeWebTheme) private var theme

    func body(content: Content) -> some View {
        content
            .background(theme.surfacePanelColor)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.1), radius: 12, y: 10)
    }
}

extension View {
    func overlayPanelChrome() -> some View {
        modifier(OverlayPanelChrome())
    }

    func modalDialogChrome(maxWidth: CGFloat, identifier: String) -> some View {
        modifier(ModalDialogChrome(maxWidth: maxWidth, identifier: identifier))
    }
}
