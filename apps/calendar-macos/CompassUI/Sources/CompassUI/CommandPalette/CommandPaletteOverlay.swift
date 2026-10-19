import CompassData
import CompassKit
import SwiftUI

public struct CommandPaletteOverlay: View {
    private static let resultsMaxHeight: CGFloat = 360

    @Environment(\.nativeWebTheme) private var theme
    public var model: NativeCalendarRootModel
    @Bindable private var paletteStore: CommandPaletteStore
    @FocusState private var searchFocused: Bool
    @State private var resultsHeight: CGFloat = Self.resultsMaxHeight

    public init(model: NativeCalendarRootModel) {
        self.model = model
        _paletteStore = Bindable(wrappedValue: model.overlayStores.palette)
    }

    public var body: some View {
        if paletteStore.isOpen {
            let sections = model.filteredPaletteSections()
            let selectedId = model.selectedPaletteItemId
            let query = paletteStore.query
            ZStack {
                theme.overlayBackdropColor
                    .ignoresSafeArea()
                    .onTapGesture { paletteStore.close() }

                VStack(alignment: .leading, spacing: 12) {
                    TextField(
                        "Search commands, events, or type a date",
                        text: $paletteStore.query
                    )
                    .textFieldStyle(.plain)
                    .font(.rubik(15))
                    .foregroundStyle(theme.textColor)
                    .focused($searchFocused)
                    .accessibilityIdentifier("compass-native-command-palette-search")

                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(alignment: .leading, spacing: 8) {
                                if sections.isEmpty {
                                    Text("No results for “\(query)”")
                                        .foregroundStyle(theme.textMutedColor)
                                        .padding(12)
                                }
                                ForEach(sections) { section in
                                    if !section.heading.isEmpty {
                                        Text(section.heading.uppercased())
                                            .font(.rubik(11, weight: .medium))
                                            .foregroundStyle(theme.textMutedColor)
                                            .tracking(0.4)
                                    }
                                    ForEach(section.items) { item in
                                        paletteRow(item, query: query, selected: item.id == selectedId)
                                            .id(item.id)
                                    }
                                }
                            }
                            .fixedSize(horizontal: false, vertical: true)
                            .background {
                                GeometryReader { geometry in
                                    Color.clear.onChange(of: geometry.size.height, initial: true) { _, height in
                                        resultsHeight = height
                                    }
                                }
                            }
                        }
                        .frame(height: min(resultsHeight, Self.resultsMaxHeight))
                        .onChange(of: selectedId) { _, id in
                            if let id { proxy.scrollTo(id, anchor: .center) }
                        }
                        .onChange(of: paletteStore.query) { _, _ in
                            model.schedulePaletteEventSearch()
                            if let selectedId { proxy.scrollTo(selectedId, anchor: .top) }
                        }
                    }
                    paletteFooterHints
                        .accessibilityLabel("Up and Down navigate, Return selects, Escape closes")
                }
                .padding(16)
                .frame(maxWidth: 520)
                .background(theme.surfacePanelColor)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(theme.borderColor, lineWidth: 1)
                )
                .shadow(color: theme.shadowDefaultColor, radius: 16, x: 0, y: 8)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("compass-native-command-palette")
            }
            .focusOnAppear($searchFocused)
        }
    }

    @ViewBuilder
    private func paletteRow(_ item: CommandPaletteItem, query: String, selected: Bool) -> some View {
        Button {
            model.runPaletteCommand(id: item.id)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    CommandPaletteHighlightedLabel(label: item.label, query: query)
                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.rubik(11))
                            .foregroundStyle(theme.textMutedColor)
                    }
                }
                Spacer()
                if let shortcut = item.shortcut {
                    Text(paletteShortcutLabel(shortcut))
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                }
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 8)
            .background(selected ? theme.accentColor.opacity(0.08) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .overlay {
                if selected {
                    RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                        .inset(by: 0.5)
                        .stroke(theme.accentColor, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("compass-native-palette-item-\(item.id)")
    }

    private func paletteShortcutLabel(_ shortcut: String) -> String {
        let normalized = shortcut
            .replacingOccurrences(of: "mod+", with: "Mod+")
            .replacingOccurrences(of: "shift+", with: "Shift+")
            .replacingOccurrences(of: "alt+", with: "Alt+")
        let parts = normalized.split(separator: "+").map { part -> String in
            let token = String(part)
            switch token.lowercased() {
            case "mod": return "Mod"
            case "shift": return "Shift"
            case "alt": return "Alt"
            default: return token.count == 1 ? token.uppercased() : token
            }
        }
        return KeycapGlyphs.display(parts)
    }

    private var paletteFooterHints: some View {
        HStack(spacing: 6) {
            footerKeycap("↑")
            footerKeycap("↓")
            Text("Navigate")
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
            footerKeycap("↩")
            Text("Select")
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
            footerKeycap("Esc")
            Text("Close")
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
        }
    }

    private func footerKeycap(_ label: String) -> some View {
        ShortcutHintChip(label: label)
    }
}
