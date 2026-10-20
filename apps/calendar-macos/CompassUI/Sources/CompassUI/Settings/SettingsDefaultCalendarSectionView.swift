import CompassData
import CompassKit
import SwiftUI

struct SettingsDefaultCalendarSectionView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var settingsStore: SettingsStore
    let calendars: [CompassCalendar]
    let hasConnectedAccount: Bool

    private var writable: [CompassCalendar] {
        DefaultCalendarResolver.writableCalendars(calendars, hasConnectedAccount: hasConnectedAccount)
    }

    private var resolvedDefault: CompassCalendar? {
        DefaultCalendarResolver.resolvedDefault(
            calendars: calendars,
            storedId: settingsStore.defaultCalendarId,
            hasConnectedAccount: hasConnectedAccount)
    }

    private var selectedName: String {
        let id = settingsStore.defaultCalendarId ?? resolvedDefault?.id
        return writable.first { $0.id == id }?.name ?? resolvedDefault?.name ?? ""
    }

    var body: some View {
        if writable.isEmpty {
            EmptyView()
        } else {
            // Web `DefaultCalendarPicker`: a full-width native select.
            VStack(alignment: .leading, spacing: 4) {
                SettingsFieldLabel("Default Calendar")
                Menu {
                    ForEach(writable, id: \.id) { calendar in
                        Button(calendar.name) { settingsStore.setDefaultCalendarId(calendar.id) }
                    }
                } label: {
                    HStack {
                        Text(selectedName)
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .settingsSelectChrome()
                }
                .menuStyle(.button)
                .buttonStyle(.plain)
                .menuIndicator(.hidden)
                .accessibilityLabel("Default Calendar: \(selectedName)")
            }
            .accessibilityIdentifier("settings-section-default-calendar")
        }
    }
}
