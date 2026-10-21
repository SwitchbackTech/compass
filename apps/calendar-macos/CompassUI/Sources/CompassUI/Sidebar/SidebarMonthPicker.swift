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
    /// The calendar's clock (`referenceNow`), so fixtures and pinned zones agree on today.
    public let today: Date
    /// Web sidebar days are keyboard targets only; the form's date popover
    /// reuses this picker with clickable days.
    public let daysAreClickable: Bool
    private let trailingHeader: AnyView?

    public init(
        displayedMonth: Binding<Date>,
        selectedDate: Date,
        onSelectDate: @escaping (Date) -> Void,
        focusedDate: Date? = nil,
        visibleDayCount: Int = 1,
        today: Date = Date(),
        daysAreClickable: Bool = false,
        trailingHeader: (() -> some View)? = nil
    ) {
        _displayedMonth = displayedMonth
        self.selectedDate = selectedDate
        self.onSelectDate = onSelectDate
        self.visibleDayCount = visibleDayCount
        self.focusedDate = focusedDate
        self.today = today
        self.daysAreClickable = daysAreClickable
        if let trailingHeader {
            self.trailingHeader = AnyView(trailingHeader())
        } else {
            self.trailingHeader = nil
        }
    }

    /// A picker with no trailing header content.
    public init(
        displayedMonth: Binding<Date>,
        selectedDate: Date,
        onSelectDate: @escaping (Date) -> Void,
        today: Date = Date(),
        daysAreClickable: Bool = false
    ) {
        _displayedMonth = displayedMonth
        self.selectedDate = selectedDate
        self.onSelectDate = onSelectDate
        self.visibleDayCount = 1
        self.focusedDate = nil
        self.today = today
        self.daysAreClickable = daysAreClickable
        self.trailingHeader = nil
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
            VStack(spacing: 0) {
                HStack(spacing: 4) {
                    ForEach(0 ..< 7, id: \.self) { index in
                        Text(weekdayLabel(index))
                            .font(.rubik(10))
                            .foregroundStyle(theme.textMutedColor)
                            .frame(maxWidth: .infinity, minHeight: 20)
                            .accessibilityHidden(true)
                    }
                }
                .padding(.bottom, 6)
                ForEach(0 ..< dayCells.count / 7, id: \.self) { row in
                    let days = Array(dayCells[(row * 7) ..< (row * 7 + 7)])
                    HStack(spacing: 4) {
                        ForEach(days, id: \.self) { day in
                            dayButton(day)
                        }
                    }
                    .frame(height: 32.333)
                    .background {
                        if rowContainsSelectedWeek(days) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(theme.textMutedColor.opacity(0.12))
                        }
                    }
                    .overlay {
                        if visibleDayCount > 1, let focusedDate, days.contains(where: { isInRange($0, from: focusedDate) }) {
                            RoundedRectangle(cornerRadius: 4)
                                .strokeBorder(theme.accentColor, lineWidth: 2)
                                .allowsHitTesting(false)
                        }
                    }
                }
            }
        }
        .frame(height: 252, alignment: .top)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Date navigation")
        .accessibilityIdentifier("compass-native-month-picker")
    }

    private var monthHeader: some View {
        HStack(spacing: 8) {
            Text(monthTitle)
                .font(.rubik(14, weight: .medium))
                .foregroundStyle(theme.textColor)
                .fixedSize()
                .frame(minWidth: 64, alignment: .leading)
            HStack(spacing: 4) {
                monthButton("Previous month", symbol: "chevron.left") { shiftMonth(-1) }
                monthButton("Next month", symbol: "chevron.right") { shiftMonth(1) }
            }
            // Web "Go to this month": a small circle, hidden on the current month.
            Button {
                displayedMonth = today
            } label: {
                Circle()
                    .stroke(theme.textColor, lineWidth: 1.5)
                    .frame(width: 10, height: 10)
                    .frame(width: 24, height: 24)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Go to this month")
            .help("Go to this month")
            .opacity(isCurrentMonth ? 0 : 1)
            .disabled(isCurrentMonth)
            Spacer(minLength: 0)
        }
    }

    private func dayButton(_ day: Date) -> some View {
        let calendar = EffectiveTimeZone.calendar
        let isToday = calendar.isDate(day, inSameDayAs: today)
        // Web week mode selects the whole week row (bold), and only today
        // inside it keeps an ink circle; day mode inks the selected day.
        let weekMode = visibleDayCount > 1
        let selected = weekMode
            ? isInSelectedWeek(day)
            : isInRange(day, from: focusedDate ?? selectedDate)
        let ink = weekMode ? selected && isToday : selected
        return Button {
            onSelectDate(day)
        } label: {
            Text(dayNumber(day))
                .font(.rubik(11, weight: selected ? .semibold : .regular))
                .underline(isToday && !ink, color: theme.accentColor)
                .foregroundStyle(ink ? theme.backgroundColor : isDisplayedMonth(day) ? theme.textColor : theme.textMutedColor)
                .frame(width: 24.8, height: 24.8)
                .background {
                    // Web draws the day circles 2px outside the 1.55rem cell.
                    if ink {
                        Circle().fill(theme.textColor).padding(-2)
                    } else if isToday {
                        Circle().fill(theme.textMutedColor.opacity(0.2)).padding(-2)
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
        .allowsHitTesting(daysAreClickable)
        .accessibilityLabel(dayAccessibilityLabel(day))
        .accessibilityAddTraits(isInRange(day, from: selectedDate) ? .isSelected : [])
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = EffectiveTimeZone.timeZone
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: displayedMonth)
    }

    /// Web `MonthPicker`: Sunday-first columns for every view wider than a single day.
    private var weekStart: Int {
        1
    }

    private var dayCells: [Date] {
        SidebarMonthLayout.days(in: displayedMonth, weekStart: weekStart, calendar: EffectiveTimeZone.calendar)
    }

    private func weekdayLabel(_ index: Int) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.veryShortWeekdaySymbols[(weekStart - 1 + index) % 7]
    }

    private var isCurrentMonth: Bool {
        EffectiveTimeZone.calendar.isDate(displayedMonth, equalTo: today, toGranularity: .month)
    }

    private func isInSelectedWeek(_ date: Date) -> Bool {
        let calendar = EffectiveTimeZone.calendar
        guard let week = calendar.dateInterval(of: .weekOfYear, for: selectedDate) else {
            return false
        }
        return week.contains(date)
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

    /// Matches web `react-datepicker__week--selected` for the week containing the anchor day.
    private func rowContainsSelectedWeek(_ days: [Date]) -> Bool {
        let calendar = EffectiveTimeZone.calendar
        let anchor = calendar.startOfDay(for: selectedDate)
        guard let rowStart = days.first.map({ calendar.startOfDay(for: $0) }),
              let rowEnd = days.last.flatMap({ calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: $0)) })
        else { return false }
        return anchor >= rowStart && anchor < rowEnd
    }

    private func shiftMonth(_ offset: Int) {
        if let next = EffectiveTimeZone.calendar.date(byAdding: .month, value: offset, to: displayedMonth) {
            displayedMonth = next
        }
    }

    private func monthButton(_ label: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.textColor.opacity(0.9))
                .frame(width: 24, height: 24)
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
