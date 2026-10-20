import CompassData
import CompassKit
import SwiftUI

struct EventFormTitleField: View {
    @Environment(\.nativeWebTheme) private var theme
    let draft: GridEventDraft
    @Binding var title: String
    @FocusState.Binding var focused: Bool
    var isReadOnly: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            TextField(
                "",
                text: $title,
                prompt: Text("Title").foregroundStyle(theme.textMutedColor)
            )
            .textFieldStyle(.plain)
            .font(.rubik(NativeWebLayoutTokens.fontSizeXL, weight: .semibold))
            .foregroundStyle(theme.textColor)
            .padding(.horizontal, 8)
            .frame(minHeight: 34, alignment: .leading)
            .focused($focused)
            .disabled(isReadOnly)
            .accessibilityIdentifier("compass-event-form-title")

            EventFormTitleUnderline(colorSlot: draft.color, expanded: focused)
        }
        .pageJumpChipAnchor(id: "form-title")
    }
}

/// Web `Focusable` + `Divider`: 2px gradient bar, width animates in on focus.
private struct EventFormTitleUnderline: View {
    @Environment(\.nativeWebTheme) private var theme
    let colorSlot: EventColorSlot?
    let expanded: Bool

    var body: some View {
        GeometryReader { geometry in
            let base = colorSlot.map { BlockPartyColor.swiftUIColor(for: $0, theme: theme) }
                ?? theme.accentColor
            LinearGradient(
                colors: [base.opacity(0.85), base.opacity(0.35)],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(width: expanded ? geometry.size.width : 0, height: 2)
            .frame(maxWidth: .infinity, alignment: .leading)
            .animation(.easeOut(duration: 0.3), value: expanded)
        }
        .frame(height: 2)
    }
}
