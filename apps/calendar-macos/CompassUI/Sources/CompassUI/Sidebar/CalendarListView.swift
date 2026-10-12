import CompassData
import CompassKit
import SwiftUI

/// Web `CalendarList`: active calendars grouped by account, each row a color
/// dot (filled when shown) that toggles the calendar's visibility on click.
struct CalendarListView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    private struct AccountGroup {
        let account: String?
        var calendars: [CompassCalendar]
    }

    private var groups: [AccountGroup] {
        let calendars = model.sidebarCalendars
        var order: [String?] = []
        var byAccount: [String?: [CompassCalendar]] = [:]
        for calendar in calendars {
            let account = model.isSignedIn ? calendar.accountEmail : nil
            if byAccount[account] == nil {
                order.append(account)
            }
            byAccount[account, default: []].append(calendar)
        }
        return order.map { AccountGroup(account: $0, calendars: byAccount[$0] ?? []) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(groups, id: \.account) { group in
                VStack(alignment: .leading, spacing: 6) {
                    if let account = group.account {
                        Text(account)
                            .font(.rubik(14, weight: .semibold))
                            .foregroundStyle(theme.textMutedColor)
                            .lineLimit(1)
                            .truncationMode(.middle)
                    }
                    ForEach(group.calendars, id: \.id) { calendar in
                        row(calendar)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Calendars")
    }

    private func row(_ calendar: CompassCalendar) -> some View {
        let isVisible = model.calendarVisibilityStore.isVisible(calendar.id)
        let color = EventCardColorParser.nsColor(hex: calendar.backgroundColor).map(Color.init(nsColor:))
            ?? theme.accentColor
        return Button {
            model.toggleCalendarVisibility(calendar)
        } label: {
            HStack(spacing: 8) {
                Circle()
                    .fill(isVisible ? color : .clear)
                    .overlay(Circle().stroke(color, lineWidth: 2))
                    .frame(width: 14, height: 14)
                Text(calendar.name)
                    .font(.rubik(12))
                    .foregroundStyle(theme.textMutedColor)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(calendar.name)
        .accessibilityValue(isVisible ? "Shown" : "Hidden")
        .accessibilityHint(isVisible ? "Hide this calendar" : "Show this calendar")
    }
}
