import SwiftUI

/// Web `OverlayPanel` `titleAction` close button: 32pt, muted X, overlay fill on hover.
struct ModalDialogCloseButton: View {
    @Environment(\.nativeWebTheme) private var theme
    @State private var isHovered = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "xmark")
                .font(.system(size: 13, weight: .medium))
                .frame(width: 32, height: 32)
                .background(isHovered ? theme.surfaceOverlayColor : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(isHovered ? theme.textColor : theme.textMutedColor)
        .onHover { isHovered = $0 }
        .accessibilityLabel("Close")
    }
}
