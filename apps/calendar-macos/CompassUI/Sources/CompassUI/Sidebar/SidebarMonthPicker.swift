import CompassKit
import SwiftUI

public struct SidebarMonthPicker: View {
    @Environment(\.nativeWebTheme) private var theme
    @Binding public var displayedMonth: Date
    public let selectedDate: Date
    public let visibleDayCount: Int
    public let onSelectDate: (Date) -> Void
    /// Day holding keyboard focus (`i`), drawn with a ring.
    public let focusedDate: Date?
    private let trailingHeader: AnyView?

    public init(
        displayedMonth: Binding<Date>,
        selectedDate: Date,
        onSelectDate: @escaping (Date) -> Void,
        focusedDate: Date? = nil,
        visibleDayCount: Int = 1,
        trailingHeader: (() -> some View)? = nil
    ) {
        _displayedMonth = displayedMonth
        self.selectedDate = selectedDate
        self.onSelectDate = onSelectDate
        self.visibleDayCount = visibleDayCount
        self.focusedDate = focusedDate
        if let trailingHeader {
            self.trailingHeader = AnyView(trailingHeader())
        } else {
            self.trailingHeader = nil
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 8) {
                    monthHeader
                    if let trailingHeader { trailingHeader.fixedSize() }
                }
                VStack(alignment: .leading, spacing: 4) {
                    monthHeader
                    if let trailingHeader { trailingHeader }
                }
            }
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    ForEach(0 ..< 7, id: \.self) { index in
                        Text(weekdayLabel(index))
                            .font(.rubik(11))
                            .foregroundStyle(theme.textMutedColor)
                            .frame(maxWidth: .infinity, minHeight: 20)
                            .accessibilityHidden(true)
                    }
                }
                ForEach(0 ..< dayCells.count / 7, id: \.self) { row in
                    let days = Array(dayCells[(row * 7) ..< (row * 7 + 7)])
                    HStack(spacing: 4) {
                        ForEach(days, id: \.self) { day in
                            dayButton(day)
                        }
                    }
                    .background {
                        if days.contains(where: { isInRange($0, from: selectedDate) })
                            || (visibleDayCount > 1 && days.contains(where: { isInRange($0, from: focusedDate ?? selectedDate) }))
                        {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(theme.textMutedColor.opacity(0.15))
                        }
                    }
                    .overlay {
                        if visibleDayCount > 1, let focusedDate, days.contains(where: { isInRange($0, from: focusedDate) }) {
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(theme.accentColor, lineWidth: 2)
                                .allowsHitTesting(false)
                        }
                    }
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Date navigation")
        .accessibilityIdentifier("compass-native-month-picker")
    }

    private var monthHeader: some View {
        HStack(spacing: 8) {
            Text(monthTitle)
                .font(.rubik(13))
                .foregroundStyle(theme.textColor)
                .fixedSize()
            HStack(spacing: 4) {
                monthButton("Previous month", symbol: "chevron.left") { shiftMonth(-1) }
                monthButton("Next month", symbol: "chevron.right") { shiftMonth(1) }
                monthButton("Current month", symbol: "arrow.uturn.backward") {
                    displayedMonth = Date()
                }
            }
            Spacer(minLength: 0)
        }
    }

    private func dayButton(_ day: Date) -> some View {
        let calendar = EffectiveTimeZone.calendar
        let selected = isInRange(day, from: focusedDate ?? selectedDate)
        let ink = visibleDayCount == 1 ? selected : selected && calendar.isDateInToday(day)
        return Button {
            onSelectDate(day)
        } label: {
            Text(dayNumber(day))
                .font(.rubik(12, weight: selected ? .semibold : .regular))
                .foregroundStyle(ink ? theme.backgroundColor : isDisplayedMonth(day) ? theme.textColor : theme.textMutedColor)
                .frame(width: 24, height: 24)
                .background {
                    if ink {
                        Circle().fill(theme.textColor)
                    } else if calendar.isDateInToday(day) {
                        Circle().fill(theme.textMutedColor.opacity(0.2))
                    }
                }
                .overlay {
                    if visibleDayCount == 1, let focusedDate, calendar.isDate(day, inSameDayAs: focusedDate) {
                        Circle().stroke(theme.accentColor, lineWidth: 2)
                    }
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(dayAccessibilityLabel(day))
        .accessibilityAddTraits(isInRange(day, from: selectedDate) ? .isSelected : [])
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: displayedMonth)
    }

    private var weekStart: Int {
        visibleDayCount == 1 ? 1 : EffectiveTimeZone.calendar.component(.weekday, from: selectedDate)
    }

    private var dayCells: [Date] {
        SidebarMonthLayout.days(in: displayedMonth, weekStart: weekStart, calendar: EffectiveTimeZone.calendar)
    }

    private func weekdayLabel(_ index: Int) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.veryShortWeekdaySymbols[(weekStart - 1 + index) % 7]
    }

    private func isDisplayedMonth(_ date: Date) -> Bool {
        EffectiveTimeZone.calendar.isDate(date, equalTo: displayedMonth, toGranularity: .month)
    }

    private func isInRange(_ date: Date, from start: Date) -> Bool {
        let calendar = EffectiveTimeZone.calendar
        let start = calendar.startOfDay(for: start)
        guard let end = calendar.date(byAdding: .day, value: max(1, visibleDayCount), to: start) else { return false }
        return date >= start && date < end
    }

    private func shiftMonth(_ offset: Int) {
        if let next = EffectiveTimeZone.calendar.date(byAdding: .month, value: offset, to: displayedMonth) {
            displayedMonth = next
        }
    }

    private func monthButton(_ label: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 10))
                .foregroundStyle(theme.textMutedColor)
                .frame(width: 18, height: 24)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .help(label)
    }

    private func dayNumber(_ date: Date) -> String {
        String(EffectiveTimeZone.calendar.component(.day, from: date))
    }

    private func dayAccessibilityLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}
