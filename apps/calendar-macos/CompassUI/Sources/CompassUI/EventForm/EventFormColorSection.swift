import CompassData
import CompassKit
import SwiftUI

struct EventFormColorSection: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let draft: GridEventDraft
    let focusField: EventFormField

    var body: some View {
        // Web `EventColorPicker`: swatches (the legend is screen-reader text),
        // then the Mod+digit jump keycaps pushed to the trailing edge.
        HStack(alignment: .bottom, spacing: 6) {
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
            if let digit = FormFieldDigitMapping.digitLabel(
                for: .color, rows: model.shortcutRegistry.editSequenceFields)
            {
                HStack(spacing: 4) {
                    ShortcutHintChip(label: KeycapGlyphs.display(["mod"]))
                    ShortcutHintChip(label: digit)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Command \(digit) jumps to color")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func colorSwatch(label: String, slot: EventColorSlot?) -> some View {
        let selected = draft.color == slot
        return Button {
            model.updateDraftFromForm(color: .some(slot))
        } label: {
            // Web swatch: `rounded-sm` with a 1px text border and a 2px text
            // outline offset by 1 when checked; Default is `bg-primary` + border.
            RoundedRectangle(cornerRadius: 2)
                .fill(swatchColor(slot))
                .frame(width: 20, height: 20)
                .overlay(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(selected ? theme.textColor : (slot == nil ? theme.borderColor : .clear), lineWidth: 1)
                )
                .padding(selected ? 1 : 0)
                .overlay {
                    if selected {
                        RoundedRectangle(cornerRadius: 3)
                            .stroke(theme.textColor, lineWidth: 2)
                            .padding(-2)
                    }
                }
                .padding(selected ? -1 : 0)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func swatchColor(_ slot: EventColorSlot?) -> Color {
        guard let slot, let color = ColorEnum(rawValue: slot.rawValue),
              let nativeColor = EventCardColorParser.nsColor(hex: EventColorSlotHex.hex(for: color))
        else { return theme.backgroundColor }
        return Color(nsColor: nativeColor)
    }
}
