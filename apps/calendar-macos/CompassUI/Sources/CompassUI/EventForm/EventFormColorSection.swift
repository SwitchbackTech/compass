import CompassData
import CompassKit
import SwiftUI

struct EventFormColorSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft
    let focusField: EventFormField

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Color")
                .font(.rubik(12))
                .foregroundStyle(theme.textMutedColor)
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 20, maximum: 20), spacing: 6)],
                alignment: .leading, spacing: 6
            ) {
                colorSwatch(label: "Default", slot: nil)
                ForEach(EventColorSlot.allCases, id: \.rawValue) { slot in
                    colorSwatch(label: slot.rawValue, slot: slot)
                }
            }
            .accessibilityIdentifier("compass-event-form-color")
            .pageJumpChipAnchor(id: "form-color")
        }
        .eventFormSectionChrome(focused: focusField == .color)
    }

    private func colorSwatch(label: String, slot: EventColorSlot?) -> some View {
        let selected = draft.color == slot
        return Button {
            model.updateDraftFromForm(color: .some(slot))
        } label: {
            RoundedRectangle(cornerRadius: 4)
                .fill(swatchColor(slot))
                .frame(width: 20, height: 20)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(selected ? theme.textColor : theme.borderColor, lineWidth: selected ? 2 : 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func swatchColor(_ slot: EventColorSlot?) -> Color {
        guard let slot, let color = ColorEnum(rawValue: slot.rawValue),
              let nativeColor = EventCardColorParser.nsColor(hex: EventColorSlotHex.hex(for: color))
        else { return theme.borderColor }
        return Color(nsColor: nativeColor)
    }
}
