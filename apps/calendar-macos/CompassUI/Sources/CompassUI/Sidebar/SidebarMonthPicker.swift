import CompassKit
import SwiftUI

public struct SidebarMonthPicker: View {
    @Environment(\.nativeWebTheme) private var theme
    @Binding public var displayedMonth: Date
    public let selectedDate: Date
    public let referenceNow: Date
    public let viewRangeStart: Date
    public let viewRangeEnd: Date
    public let visibleDayCount: Int
    public let onSelectDate: (Date) -> Void
    /// Day holding keyboard focus (`i`), drawn with a ring.
    public let focusedDate: Date?
    private let trailingHeader: AnyView?

    public init(
        displayedMonth: Binding<Date>,
        selectedDate: Date,
        referenceNow: Date,
        viewRangeStart: Date,
        viewRangeEnd: Date,
        onSelectDate: @escaping (Date) -> Void,
        focusedDate: Date? = nil,
        visibleDayCount: Int = 1,
        trailingHeader: (() -> some View)? = nil
    ) {
        _displayedMonth = displayedMonth
        self.selectedDate = selectedDate
        self.referenceNow = referenceNow
        self.viewRangeStart = viewRangeStart
        self.viewRangeEnd = viewRangeEnd
        self.onSelectDate = onSelectDate
        self.visibleDayCount = visibleDayCount
        self.focusedDate = focusedDate
        if let trailingHeader {
            self.trailingHeader = AnyView(trailingHeader())
        } else {
            self.trailingHeader = nil
        }
    }

    private var isWeekPickerUnit: Bool { visibleDayCount > 1 }

    /// Web `--date-picker-hover-bg` on sidebar month cells.
    private var datePickerHoverFill: Color {
        theme.textMutedColor.opacity(0.18)
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
                        if rowHasVisibleWindow(days) || rowContainsSelectionWeek(days) {
                            RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                                .fill(datePickerHoverFill)
                        }
                    }
                    .overlay {
                        if isWeekPickerUnit, let focusedDate, days.contains(where: { isInSelectionRange($0, anchor: focusedDate) }) {
                            RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
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
                .font(.rubik(13))
                .foregroundStyle(theme.textColor)
                .fixedSize()
            HStack(spacing: 4) {
                monthButton("Previous month", symbol: "chevron.left") { shiftMonth(-1) }
                monthButton("Next month", symbol: "chevron.right") { shiftMonth(1) }
                monthButton("Current month", symbol: "arrow.uturn.backward") {
                    displayedMonth = referenceNow
                }
            }
            Spacer(minLength: 0)
        }
    }

    private func dayButton(_ day: Date) -> some View {
        let calendar = EffectiveTimeZone.calendar
        let selectionAnchor = focusedDate ?? selectedDate
        let selectedInPicker = isInSelectionRange(day, anchor: selectionAnchor)
        let isToday = calendar.isDate(day, inSameDayAs: referenceNow)
        let inView = isInVisibleWindow(day)
        let dayModeSelected = !isWeekPickerUnit && selectedInPicker

        return Button {
            onSelectDate(day)
        } label: {
            Text(dayNumber(day))
                .font(.rubik(11, weight: selectedInPicker ? .semibold : .regular))
                .underline(isToday && !dayModeSelected, color: isWeekPickerUnit ? theme.textColor : theme.accentColor)
                .foregroundStyle(
                    dayModeSelected
                        ? theme.onAccentColor
                        : (isDisplayedMonth(day) ? theme.textColor : theme.textMutedColor)
                )
                .frame(width: 24.8, height: 24.8)
                .background {
                    if dayModeSelected {
                        Circle().fill(theme.accentColor)
                    } else if isToday {
                        Circle().fill(datePickerHoverFill)
                    }
                }
                .overlay {
                    if !isWeekPickerUnit, let focusedDate, calendar.isDate(day, inSameDayAs: focusedDate) {
                        Circle().stroke(theme.accentColor, lineWidth: 2)
                    }
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .allowsHitTesting(false)
        .accessibilityLabel(dayAccessibilityLabel(day))
        .accessibilityAddTraits(isInSelectionRange(day, anchor: selectedDate) ? .isSelected : [])
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

    private func isDisplayedMonth(_ date: Date) -> Bool {
        EffectiveTimeZone.calendar.isDate(date, equalTo: displayedMonth, toGranularity: .month)
    }

    private func isInSelectionRange(_ date: Date, anchor: Date) -> Bool {
        let calendar = EffectiveTimeZone.calendar
        let start = calendar.startOfDay(for: anchor)
        let span = isWeekPickerUnit ? 7 : max(1, visibleDayCount)
        guard let end = calendar.date(byAdding: .day, value: span, to: start) else { return false }
        let day = calendar.startOfDay(for: date)
        return day >= start && day < end
    }

    private func isInVisibleWindow(_ date: Date) -> Bool {
        let calendar = EffectiveTimeZone.calendar
        let day = calendar.startOfDay(for: date)
        let start = calendar.startOfDay(for: viewRangeStart)
        let end = calendar.startOfDay(for: viewRangeEnd)
        return day >= start && day <= end
    }

    private func rowHasVisibleWindow(_ days: [Date]) -> Bool {
        days.contains { isInVisibleWindow($0) }
    }

    /// Week row containing the selection anchor (web `react-datepicker__week--selected`).
    private func rowContainsSelectionWeek(_ days: [Date]) -> Bool {
        guard isWeekPickerUnit else { return false }
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
