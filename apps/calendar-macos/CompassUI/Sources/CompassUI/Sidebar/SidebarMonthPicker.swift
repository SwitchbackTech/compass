import CompassKit
import SwiftUI

public struct SidebarMonthPicker: View {
    @Environment(\.nativeWebTheme) private var theme
    @Binding public var displayedMonth: Date
    public let selectedDate: Date
    public let onSelectDate: (Date) -> Void
    /// Day holding keyboard focus (`i`), drawn with a ring.
    public let focusedDate: Date?
    private let trailingHeader: AnyView?

    public init(
        displayedMonth: Binding<Date>,
        selectedDate: Date,
        onSelectDate: @escaping (Date) -> Void,
        focusedDate: Date? = nil,
        trailingHeader: (() -> some View)? = nil
    ) {
        _displayedMonth = displayedMonth
        self.selectedDate = selectedDate
        self.onSelectDate = onSelectDate
        self.focusedDate = focusedDate
        if let trailingHeader {
            self.trailingHeader = AnyView(trailingHeader())
        } else {
            self.trailingHeader = nil
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(monthTitle)
                    .font(.rubik(13))
                    .foregroundStyle(theme.textColor)
                Spacer()
                if let trailingHeader {
                    trailingHeader
                }
                monthArrow(systemName: "chevron.left", label: "Previous month", months: -1)
                monthArrow(systemName: "chevron.right", label: "Next month", months: 1)
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
                ForEach(Array(weekdayLetters.enumerated()), id: \.offset) { _, letter in
                    Text(letter)
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                        .frame(maxWidth: .infinity)
                        .accessibilityHidden(true)
                }
                ForEach(dayCells, id: \.self) { day in
                    if let day {
                        Button {
                            onSelectDate(day)
                        } label: {
                            Text(dayNumber(day))
                                .font(.rubik(12))
                                .frame(maxWidth: .infinity, minHeight: 24)
                                .foregroundStyle(theme.textColor)
                                .background(
                                    isSameDay(day, selectedDate)
                                        ? theme.textMutedColor.opacity(0.35)
                                        : Color.clear
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay {
                                    if let focusedDate, isSameDay(day, focusedDate) {
                                        RoundedRectangle(cornerRadius: 4)
                                            .stroke(theme.accentColor, lineWidth: 2)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(dayAccessibilityLabel(day))
                    } else {
                        Color.clear.frame(minHeight: 24)
                    }
                }
            }
        }
        .accessibilityIdentifier("compass-native-month-picker")
    }

    /// Web `react-datepicker` header: step the shown month without moving the grid.
    private func monthArrow(systemName: String, label: String, months: Int) -> some View {
        Button {
            if let next = EffectiveTimeZone.calendar.date(byAdding: .month, value: months, to: displayedMonth) {
                displayedMonth = next
            }
        } label: {
            Image(systemName: systemName)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(theme.textMutedColor)
                .frame(width: 20, height: 20)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    /// One letter per column, starting on the calendar's first weekday.
    private var weekdayLetters: [String] {
        let calendar = EffectiveTimeZone.calendar
        var formatterCalendar = calendar
        formatterCalendar.locale = Locale(identifier: "en_US_POSIX")
        let symbols = formatterCalendar.veryShortStandaloneWeekdaySymbols
        let first = calendar.firstWeekday - 1
        return Array(symbols[first...] + symbols[..<first])
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: displayedMonth)
    }

    private var dayCells: [Date?] {
        let calendar = EffectiveTimeZone.calendar
        guard let monthInterval = calendar.dateInterval(of: .month, for: displayedMonth),
              let firstWeek = calendar.dateInterval(of: .weekOfYear, for: monthInterval.start)
        else {
            return []
        }
        var days: [Date?] = []
        var cursor = firstWeek.start
        while cursor < monthInterval.end || days.count % 7 != 0 {
            if cursor >= monthInterval.start, cursor < monthInterval.end {
                days.append(cursor)
            } else if days.count < 42 {
                days.append(nil)
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
            if days.count >= 42 { break }
        }
        return days
    }

    private func dayNumber(_ date: Date) -> String {
        String(EffectiveTimeZone.calendar.component(.day, from: date))
    }

    private func isSameDay(_ lhs: Date, _ rhs: Date) -> Bool {
        EffectiveTimeZone.calendar.isDate(lhs, inSameDayAs: rhs)
    }

    private func dayAccessibilityLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}
