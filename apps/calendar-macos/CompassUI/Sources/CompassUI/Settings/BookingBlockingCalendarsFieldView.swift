import CompassData
import CompassKit
import SwiftUI

struct BookingBlockingCalendarsFieldView: View {
    @Environment(\.nativeWebTheme) private var theme
    let availabilityCalendars: [CompassCalendar]
    let blockingCalendarIds: [String]
    let connections: [UserMetadataConnections]
    let onToggle: (String, Bool) -> Void

    private var blockingSet: Set<String> {
        Set(blockingCalendarIds)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Blocking calendars")
                .font(.rubik(12))
                .foregroundStyle(theme.textColor)
            if availabilityCalendars.isEmpty {
                Text("No calendars available.")
                    .font(.rubik(12))
                    .foregroundStyle(theme.textMutedColor)
            } else {
                groupedContent
            }
        }
        .accessibilityIdentifier("booking-blocking-calendars")
    }

    @ViewBuilder
    private var groupedContent: some View {
        let grouped = CalendarAccountGrouping.groupCalendarsByAccount(
            calendars: availabilityCalendars,
            connections: connections
        )
        let groupsWithCalendars = grouped.groups.filter { !$0.calendars.isEmpty }
        let calendarCount = availabilityCalendars.count
        let useCollapsibleGroups =
            groupsWithCalendars.count > 1
            || calendarCount > BookingBlockingCalendarsLogic.collapseThreshold
        let defaultCollapsed =
            calendarCount > BookingBlockingCalendarsLogic.collapseThreshold

        if useCollapsibleGroups {
            ForEach(groupsWithCalendars, id: \.accountKey) { group in
                BookingBlockingAccountGroupView(
                    blockingSet: blockingSet,
                    defaultCollapsed: defaultCollapsed,
                    group: group,
                    onToggle: onToggle
                )
            }
            ForEach(grouped.ungrouped, id: \.id) { calendar in
                blockingRow(calendar)
            }
        } else {
            ForEach(groupsWithCalendars, id: \.accountKey) { group in
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(group.calendars, id: \.id) { calendar in
                        blockingRow(calendar)
                    }
                }
            }
            ForEach(grouped.ungrouped, id: \.id) { calendar in
                blockingRow(calendar)
            }
        }
    }

    private func blockingRow(_ calendar: CompassCalendar) -> some View {
        Toggle(
            calendar.name,
            isOn: Binding(
                get: { blockingSet.contains(calendar.id) },
                set: { onToggle(calendar.id, $0) }
            )
        )
        .font(.rubik(12))
    }
}

private struct BookingBlockingAccountGroupView: View {
    @Environment(\.nativeWebTheme) private var theme
    let blockingSet: Set<String>
    let defaultCollapsed: Bool
    let group: CalendarAccountGroup
    let onToggle: (String, Bool) -> Void

    @State private var isExpanded: Bool

    init(
        blockingSet: Set<String>,
        defaultCollapsed: Bool,
        group: CalendarAccountGrouping.AccountGroup,
        onToggle: @escaping (String, Bool) -> Void
    ) {
        self.blockingSet = blockingSet
        self.defaultCollapsed = defaultCollapsed
        self.group = group
        self.onToggle = onToggle
        _isExpanded = State(initialValue: !defaultCollapsed)
    }

    private var blockingCount: Int {
        group.calendars.filter { blockingSet.contains($0.id) }.count
    }

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: 6) {
                ForEach(group.calendars, id: \.id) { calendar in
                    Toggle(
                        calendar.name,
                        isOn: Binding(
                            get: { blockingSet.contains(calendar.id) },
                            set: { onToggle(calendar.id, $0) }
                        )
                    )
                    .font(.rubik(12))
                }
            }
            .padding(.leading, 4)
        } label: {
            HStack(spacing: 6) {
                Text(group.accountLabel)
                    .font(.rubik(12))
                    .foregroundStyle(theme.textMutedColor)
                    .lineLimit(1)
                Text("\(blockingCount) of \(group.calendars.count) blocking")
                    .font(.rubik(11))
                    .foregroundStyle(theme.textMutedColor)
            }
        }
    }
}
