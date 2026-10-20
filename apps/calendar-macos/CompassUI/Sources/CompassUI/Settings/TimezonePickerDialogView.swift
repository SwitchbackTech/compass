import CompassData
import CompassKit
import SwiftUI

struct TimezonePickerDialogView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var settingsStore: SettingsStore
    @Bindable var viewStore: ViewStore
    @State private var query = ""

    private var purpose: TimezoneDialogPurpose {
        settingsStore.timezoneDialogPurpose ?? .pin
    }

    private var title: String {
        purpose == .timeTravel ? "Second timezone" : "Change default timezone"
    }

    private var filteredZones: [String] {
        let all = TimeZone.knownTimeZoneIdentifiers.sorted()
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return Array(all.prefix(40)) }
        return all.filter { $0.localizedCaseInsensitiveContains(trimmed) }.prefix(40).map { $0 }
    }

    var body: some View {
        ZStack {
            theme.panelBackdropColor
                .ignoresSafeArea()
                .onTapGesture { settingsStore.dismissTimezoneDialog() }
            VStack(alignment: .leading, spacing: 12) {
                // Web `TimezonePickerDialog`: title and message only; Esc or
                // the backdrop dismisses.
                ModalDialogTitle(title)
                if purpose == .timeTravel {
                    ModalDialogMessage("Compare your calendar hours in a second timezone.")
                }
                TextField("Search timezones", text: $query)
                    .textFieldStyle(.roundedBorder)
                if purpose == .pin {
                    timezoneRow(label: "Use browser timezone (Auto)", value: nil)
                }
                if purpose == .timeTravel, viewStore.timeTravelTimeZone != nil {
                    timezoneRow(label: "Hide second timezone", value: nil, clearsTravel: true)
                }
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        ForEach(filteredZones, id: \.self) { zone in
                            if purpose != .timeTravel || zone != viewStore.effectiveTimeZone {
                                timezoneRow(
                                    label: "\(TimeZoneFormatting.cityName(for: zone)) (\(TimeZoneFormatting.abbreviation(for: zone)))",
                                    value: zone)
                            }
                        }
                    }
                }
                .frame(height: 240)
            }
            .padding(OverlayPanelChrome.padding)
            .frame(width: 480)
            .overlayPanelChrome()
        }
        .accessibilityIdentifier("compass-native-timezone-dialog")
    }

    @ViewBuilder
    private func timezoneRow(label: String, value: String?, clearsTravel: Bool = false) -> some View {
        Button(label) {
            if purpose == .timeTravel {
                if clearsTravel {
                    settingsStore.setTimeTravelTimeZone(nil)
                } else if let value {
                    settingsStore.setTimeTravelTimeZone(value)
                }
            } else {
                settingsStore.setPinnedTimeZone(value)
            }
            settingsStore.dismissTimezoneDialog()
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 6)
        .foregroundStyle(theme.textColor)
        .font(.rubik(13))
    }
}
