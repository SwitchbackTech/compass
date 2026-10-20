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
            TextField("Title", text: $title)
                .textFieldStyle(.plain)
                .font(.rubik(NativeWebLayoutTokens.fontSizeXL, weight: .semibold))
                .foregroundStyle(theme.textColor)
                .padding(.horizontal, 8)
                .frame(minHeight: 34, alignment: .leading)
                .focused($focused)
                .disabled(isReadOnly)
                .accessibilityIdentifier("compass-event-form-title")

            Rectangle()
                .fill(underlineFill)
                .frame(height: 2)
                .frame(maxWidth: .infinity)
        }
        .pageJumpChipAnchor(id: "form-title")
    }

    private var underlineFill: LinearGradient {
        let base = BlockPartyColor.swiftUIColor(for: draft.color, theme: theme)
        return LinearGradient(
            colors: [base.opacity(0.85), base.opacity(0.35)],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}
