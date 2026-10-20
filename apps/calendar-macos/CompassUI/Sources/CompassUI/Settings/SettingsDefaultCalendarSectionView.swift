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

    private var selectedCalendarLabel: String {
        let selectedId = settingsStore.defaultCalendarId ?? resolvedDefault?.id
        if let selectedId, let match = writable.first(where: { $0.id == selectedId }) {
            return match.name
        }
        return resolvedDefault?.name ?? writable.first?.name ?? "Calendar"
    }

    var body: some View {
        if writable.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Text("Default Calendar")
                    .font(.rubik(15))
                    .foregroundStyle(theme.textColor)
                Menu {
                    ForEach(writable, id: \.id) { calendar in
                        Button(calendar.name) {
                            settingsStore.setDefaultCalendarId(calendar.id)
                        }
                    }
                } label: {
                    HStack {
                        Text(selectedCalendarLabel)
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(theme.textMutedColor)
                    }
                    .font(.rubik(14))
                    .foregroundStyle(theme.textColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(theme.surfaceOverlayColor)
                    .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
                    .overlay(
                        RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                            .stroke(theme.borderColor, lineWidth: 1)
                    )
                }
                .menuStyle(.borderlessButton)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .accessibilityIdentifier("settings-section-default-calendar")
        }
    }
}
