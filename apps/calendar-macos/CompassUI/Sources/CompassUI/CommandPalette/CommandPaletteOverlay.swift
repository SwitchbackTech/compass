import CompassData
import CompassKit
import SwiftUI

public struct CommandPaletteOverlay: View {
    /// Matches web `CommandPalette` panel width (`w-[640px]`).
    private static let panelWidth: CGFloat = 640
    /// Matches web `max-h-[50vh]` on the results scroller.
    private static let resultsMaxViewportFraction: CGFloat = 0.5
    /// Matches web `mt-[15vh]` on the floating panel.
    private static let topInsetViewportFraction: CGFloat = 0.15

    @Environment(\.nativeWebTheme) private var theme
    public var model: NativeCalendarRootModel
    @Bindable private var paletteStore: CommandPaletteStore
    @FocusState private var searchFocused: Bool
    @State private var resultsHeight: CGFloat = 360

    public init(model: NativeCalendarRootModel) {
        self.model = model
        _paletteStore = Bindable(wrappedValue: model.overlayStores.palette)
    }

    public var body: some View {
        if paletteStore.isOpen {
            let sections = model.filteredPaletteSections()
            let selectedId = model.selectedPaletteItemId
            let query = paletteStore.query
            GeometryReader { geometry in
                let resultsMaxHeight = geometry.size.height * Self.resultsMaxViewportFraction
                ZStack {
                    theme.overlayBackdropColor
                        .ignoresSafeArea()
                        .onTapGesture { paletteStore.close() }

                    VStack(spacing: 0) {
                        Spacer(minLength: geometry.size.height * Self.topInsetViewportFraction)
                        VStack(alignment: .leading, spacing: 0) {
                            TextField(
                                "Search commands, events, or type a date",
                                text: $paletteStore.query
                            )
                            .textFieldStyle(.plain)
                            .font(.rubik(15))
                            .foregroundStyle(theme.textColor)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .focused($searchFocused)
                            .accessibilityIdentifier("compass-native-command-palette-search")
                            .overlay(alignment: .bottom) {
                                Rectangle()
                                    .fill(theme.borderColor)
                                    .frame(height: 1)
                            }

                            ScrollViewReader { proxy in
                                ScrollView {
                                    VStack(alignment: .leading, spacing: 4) {
                                        if sections.isEmpty {
                                            Text("No results for “\(query)”")
                                                .font(.rubik(NativeWebLayoutTokens.fontSizeBody))
                                                .foregroundStyle(theme.textMutedColor)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                        }
                                        ForEach(sections) { section in
                                            if !section.heading.isEmpty {
                                                Text(section.heading.uppercased())
                                                    .font(.rubik(12, weight: .semibold))
                                                    .foregroundStyle(theme.textColor)
                                                    .tracking(0.4)
                                                    .padding(.horizontal, 12)
                                                    .padding(.top, 8)
                                                    .padding(.bottom, 4)
                                            }
                                            ForEach(section.items) { item in
                                                paletteRow(item, query: query, selected: item.id == selectedId)
                                                    .id(item.id)
                                            }
                                        }
                                    }
                                    .fixedSize(horizontal: false, vertical: true)
                                    .background {
                                        GeometryReader { contentGeometry in
                                            Color.clear.onChange(
                                                of: contentGeometry.size.height,
                                                initial: true
                                            ) { _, height in
                                                resultsHeight = height
                                            }
                                        }
                                    }
                                }
                                .frame(height: min(resultsHeight, resultsMaxHeight))
                                .padding(8)
                                .onChange(of: selectedId) { _, id in
                                    if let id { proxy.scrollTo(id, anchor: .center) }
                                }
                                .onChange(of: paletteStore.query) { _, _ in
                                    model.schedulePaletteEventSearch()
                                    if let selectedId { proxy.scrollTo(selectedId, anchor: .top) }
                                }
                            }

                            HStack {
                                Spacer(minLength: 0)
                                paletteFooterHints
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            .overlay(alignment: .top) {
                                Rectangle()
                                    .fill(theme.borderColor)
                                    .frame(height: 1)
                            }
                            .accessibilityLabel("Up and Down navigate, Return selects, Escape closes")
                        }
                        .frame(width: Self.panelWidth)
                        .background(theme.surfacePanelColor)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(theme.borderColor, lineWidth: 1)
                        )
                        .shadow(color: theme.shadowDefaultColor, radius: 24, x: 0, y: 16)
                        .accessibilityElement(children: .contain)
                        .accessibilityIdentifier("compass-native-command-palette")
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .focusOnAppear($searchFocused)
        }
    }

    @ViewBuilder
    private func paletteRow(_ item: CommandPaletteItem, query: String, selected: Bool) -> some View {
        Button {
            model.runPaletteCommand(id: item.id)
        } label: {
            HStack(spacing: 12) {
                if let icon = item.icon {
                    PhosphorIconView(icon: icon, size: 18)
                        .frame(width: 18, alignment: .center)
                }
                VStack(alignment: .leading, spacing: 2) {
                    CommandPaletteHighlightedLabel(label: item.label, query: query)
                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.rubik(11))
                            .foregroundStyle(theme.textMutedColor)
                    }
                }
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
                if let shortcut = item.shortcut {
                    PaletteShortcutKeys(shortcut: shortcut)
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .foregroundStyle(theme.textMutedColor)
            .background(selected ? theme.surfaceOverlayColor : Color.clear)
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

    private var paletteFooterHints: some View {
        HStack(spacing: 16) {
            footerHintGroup(keys: ["↑", "↓"], label: "Navigate")
            footerHintGroup(keys: ["Enter"], label: "Select")
            footerHintGroup(keys: ["Esc"], label: "Close")
        }
        .font(.rubik(12))
        .foregroundStyle(theme.textMutedColor)
    }

    private func footerHintGroup(keys: [String], label: String) -> some View {
        HStack(spacing: 6) {
            ForEach(keys, id: \.self) { footerKeycap($0) }
            Text(label)
        }
    }

    private func footerKeycap(_ label: String) -> some View {
        ShortcutHintChip(label: label)
    }
}
