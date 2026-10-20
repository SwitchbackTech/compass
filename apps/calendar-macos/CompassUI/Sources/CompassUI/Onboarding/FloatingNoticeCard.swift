import SwiftUI

/// Web bottom-right notice shell (`fixed right-6 bottom-6`, `rounded-xl border
/// bg-surface/95 px-4 py-3 shadow-xl`) shared by the first-event and sign-up cards.
struct FloatingNoticeCard<Content: View>: View {
    @Environment(\.nativeWebTheme) private var theme
    let width: CGFloat
    var isFocused = false
    @ViewBuilder let content: Content

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                content
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .frame(width: width, alignment: .leading)
                    .background(theme.surfaceColor.opacity(0.95))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(theme.borderColor, lineWidth: 1))
                    .noticeFocusRing(isFocused)
                    .shadow(color: theme.shadowDefaultColor, radius: 20, y: 10)
                    .padding(24)
            }
        }
    }
}

/// Web small `IconButton` with an `X` glyph: muted until hovered.
struct NoticeDismissButton: View {
    @Environment(\.nativeWebTheme) private var theme
    @State private var isHovered = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "xmark")
                .font(.system(size: 11, weight: .medium))
                .frame(width: 20, height: 20)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(isHovered ? theme.textColor : theme.textMutedColor)
        .onHover { isHovered = $0 }
        .accessibilityLabel("Dismiss")
    }
}
