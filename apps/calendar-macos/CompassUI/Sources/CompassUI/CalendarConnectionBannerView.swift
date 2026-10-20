import CompassKit
import SwiftUI

/// Web `CalendarConnectionBanner`: tinted strip under the header with one
/// action (`G`). Errors tint red, a delayed catch-up tints amber.
public struct CalendarConnectionBannerView: View {
    @Environment(\.nativeWebTheme) private var theme
    @State private var isHovered = false
    let banner: CalendarConnectionBanner
    let onAction: () -> Void

    public init(banner: CalendarConnectionBanner, onAction: @escaping () -> Void) {
        self.banner = banner
        self.onAction = onAction
    }

    public var body: some View {
        let tint = banner.isError ? theme.errorColor : theme.warningColor
        HStack(spacing: 12) {
            Text(banner.message)
                .font(.rubik(14))
                .foregroundStyle(theme.textColor)
                .frame(maxWidth: .infinity, alignment: .leading)
            Button(action: onAction) {
                HStack(spacing: 8) {
                    Text(banner.actionLabel)
                        .font(.rubik(14, weight: .medium))
                    ShortcutHintChip(label: "G")
                }
                .foregroundStyle(theme.textColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(isHovered ? theme.surfaceOverlayColor : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            }
            .buttonStyle(.plain)
            .onHover { isHovered = $0 }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(tint.opacity(0.1))
        .overlay(alignment: .bottom) {
            Rectangle().fill(tint.opacity(0.4)).frame(height: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("compass-native-calendar-connection-banner")
    }
}
