import CompassData
import SwiftUI

/// Web `WelcomeFaqList`: disclosure rows toggled by click or digits 1-5.
struct WelcomeFaqListView: View {
    @Environment(\.nativeWebTheme) private var theme
    let expanded: Set<Int>
    let onToggle: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(WelcomeFaq.items.enumerated()), id: \.offset) { index, item in
                if index > 0 {
                    Rectangle()
                        .fill(theme.borderColor)
                        .frame(height: 1)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Button {
                        onToggle(index)
                    } label: {
                        HStack(spacing: 12) {
                            Text(item.question)
                                .font(.rubik(14, weight: .medium))
                                .foregroundStyle(theme.textColor)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                            ShortcutHintChip(label: String(index + 1))
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityValue(expanded.contains(index) ? "Expanded" : "Collapsed")
                    if expanded.contains(index) {
                        Text(item.answer)
                            .font(.rubik(14))
                            .foregroundStyle(theme.textMutedColor)
                            .lineSpacing(4)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.vertical, 12)
            }
        }
    }
}
