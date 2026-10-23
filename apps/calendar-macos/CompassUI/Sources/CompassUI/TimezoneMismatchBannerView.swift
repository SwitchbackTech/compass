import CompassKit
import SwiftUI

/// Web `TimezoneMismatchBanner`: muted strip offering to switch the pinned
/// calendar zone to the device zone, or keep it for this device zone.
public struct TimezoneMismatchBannerView: View {
    @Environment(\.nativeWebTheme) private var theme
    let copy: TimezoneMismatch.Copy
    let onSwitch: () -> Void
    let onKeep: () -> Void

    public init(copy: TimezoneMismatch.Copy, onSwitch: @escaping () -> Void, onKeep: @escaping () -> Void) {
        self.copy = copy
        self.onSwitch = onSwitch
        self.onKeep = onKeep
    }

    public var body: some View {
        HStack(spacing: 12) {
            Text(copy.message)
                .font(.rubik(12))
                .foregroundStyle(theme.textMutedColor)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 8) {
                BannerTextButton(
                    label: copy.switchLabel,
                    shortcut: "H",
                    weight: .medium,
                    action: onSwitch)
                BannerTextButton(
                    label: copy.keepLabel,
                    shortcut: "P",
                    weight: .regular,
                    action: onKeep)
            }
            .fixedSize()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(theme.surfacePanelColor)
        .overlay(alignment: .bottom) {
            Rectangle().fill(theme.borderColor).frame(height: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Timezone mismatch")
        .accessibilityIdentifier("compass-native-timezone-mismatch-banner")
    }
}

private struct BannerTextButton: View {
    @Environment(\.nativeWebTheme) private var theme
    @State private var isHovered = false
    let label: String
    let shortcut: String
    let weight: RubikWeight
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.rubik(12, weight: weight))
                    .foregroundStyle(theme.textColor)
                ShortcutHintChip(label: shortcut)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(isHovered ? theme.surfaceOverlayColor : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}
