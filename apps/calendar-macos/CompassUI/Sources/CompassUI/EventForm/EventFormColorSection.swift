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
                ForEach(Array(NativeCalendarRootModel.colorSwatchOptions.enumerated()), id: \.offset) { index, slot in
                    colorSwatch(label: slot?.rawValue ?? "Default", slot: slot, index: index)
                }
            }
            // Take the width the keycaps leave; without this the grid sizes to
            // its ideal width inside the HStack and wraps to five per row.
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityIdentifier("compass-event-form-color")
            .pageJumpChipAnchor(id: "form-color")
            if isKeyboardFocused {
                // Web swaps the jump hint for the in-picker keys while a swatch has focus.
                HStack(spacing: 4) {
                    ShortcutHintChip(label: KeycapGlyphs.display(["ArrowLeft"]))
                    ShortcutHintChip(label: KeycapGlyphs.display(["ArrowRight"]))
                    Text("·").font(.rubik(11)).foregroundStyle(theme.textMutedColor)
                    ShortcutHintChip(label: "Enter")
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Arrow keys move between swatches, Enter selects a swatch")
            } else if let digit = FormFieldDigitMapping.digitLabel(
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

    /// The color field owns the keyboard (Mod+6 or E then C) and the form is editable.
    private var isKeyboardFocused: Bool {
        focusField == .color && !model.isEventFormReadOnly(for: draft)
    }

    private func colorSwatch(label: String, slot: EventColorSlot?, index: Int) -> some View {
        let selected = draft.color == slot
        let pickKey = index < FormFieldDigitMapping.pickKeyLabels.count
            ? FormFieldDigitMapping.pickKeyLabels[index] : nil
        return Button {
            model.pickColorSwatch(at: index)
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
                .overlay {
                    // Web shows each swatch's pick key while focus is in the picker.
                    if isKeyboardFocused, let pickKey {
                        Text(pickKey)
                            .font(.rubik(10, weight: .semibold))
                            .foregroundStyle(theme.textColor)
                            .frame(width: 20, height: 20)
                            .background(theme.backgroundColor.opacity(0.7))
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                            .accessibilityHidden(true)
                    }
                }
                .overlay {
                    if isKeyboardFocused, model.colorSwatchFocusIndex == index {
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(theme.accentColor, lineWidth: 2)
                            .padding(-3)
                    }
                }
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
