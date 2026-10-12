import AppKit
import CompassData
import SwiftUI

/// Web `WelcomeLinks` footer on the last welcome screen. Keys are routed by
/// `NativeGridKeyboardRouter`.
struct WelcomeLinksView: View {
    @Environment(\.nativeWebTheme) private var theme

    var body: some View {
        HStack(spacing: 16) {
            Spacer()
            ForEach(WelcomeLinks.items, id: \.label) { link in
                Button {
                    NSWorkspace.shared.open(link.url)
                } label: {
                    HStack(spacing: 4) {
                        Text(link.label)
                            .font(.rubik(12))
                            .foregroundStyle(theme.textMutedColor)
                        ShortcutHintChip(label: String(link.key).uppercased())
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 16)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(theme.borderColor)
                .frame(height: 1)
        }
    }
}
