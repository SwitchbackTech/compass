import CompassData
import CompassKit
import SwiftUI

struct EventFormCompactDateField: View {
    @Environment(\.nativeWebTheme) private var theme
    @Binding var date: Date
    let accessibilityIdentifier: String
    @State private var text: String
    @State private var showsCalendar = false
    @State private var pickerMonth = Date()
    /// Web `react-datepicker` keyboard-selected day; nil until an arrow
    /// moves it, so the open calendar first shows only the selected day.
    @State private var cursor: Date?
    @FocusState private var isFocused: Bool
    @FocusState private var pickerFocused: Bool

    init(date: Binding<Date>, accessibilityIdentifier: String) {
        _date = date
        self.accessibilityIdentifier = accessibilityIdentifier
        _text = State(initialValue: EventFormDateFormat.formatLabel(for: date.wrappedValue))
        let openPicker = UITestLaunchPolicy.openEventFormDatePickerForUITest
            && accessibilityIdentifier == "compass-event-form-start-date"
        _showsCalendar = State(initialValue: openPicker)
    }

    var body: some View {
        TextField("Date", text: $text)
            .textFieldStyle(.plain)
            .font(.rubik(NativeWebLayoutTokens.fontSizeBody))
            .foregroundStyle(theme.textColor)
            .padding(.horizontal, 8)
            .frame(minWidth: 72, idealWidth: 84, maxWidth: 96)
            .frame(minHeight: 38)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .overlay {
                RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                    .stroke(isFocused ? theme.accentColor : theme.borderColor, lineWidth: 1)
            }
            .focused($isFocused)
            .accessibilityIdentifier(accessibilityIdentifier)
            .onSubmit { commitTypedDate() }
            .onKeyPress(keys: Self.handledKeys) { press in
                handleKey(press)
            }
            .onChange(of: isFocused) { _, focused in
                if !focused { commitTypedDate() }
            }
            .onChange(of: date) { _, newValue in
                guard !isFocused else { return }
                text = EventFormDateFormat.formatLabel(for: newValue)
            }
            .onTapGesture(count: 2) {
                showsCalendar = true
            }
            .popover(isPresented: $showsCalendar, arrowEdge: .bottom) {
                // Web `react-datepicker`: the same compact month grid as the sidebar.
                SidebarMonthPicker(
                    displayedMonth: $pickerMonth,
                    selectedDate: date,
                    onSelectDate: { picked in pick(picked) },
                    today: Date(),
                    daysAreClickable: true,
                    focusedDate: cursor
                )
                .frame(width: 252)
                .padding(12)
                .background(theme.surfacePanelColor)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("compass-event-form-date-picker")
                // The popover may take key focus from the field, so it
                // handles the open-calendar keys too.
                .focusable()
                .focusEffectDisabled()
                .focused($pickerFocused)
                .onKeyPress(keys: Self.handledKeys) { press in
                    handleCalendarKey(press)
                }
                .onAppear {
                    pickerMonth = date
                    pickerFocused = true
                }
                .onDisappear { cursor = nil }
            }
    }

    /// Picking a day changes the calendar day only; the time of day stays.
    static func keepingTime(of original: Date, onDayOf picked: Date) -> Date {
        let calendar = EffectiveTimeZone.calendar
        var parts = calendar.dateComponents([.year, .month, .day], from: picked)
        let time = calendar.dateComponents([.hour, .minute, .second], from: original)
        parts.hour = time.hour
        parts.minute = time.minute
        parts.second = time.second
        return calendar.date(from: parts) ?? picked
    }

    private static let handledKeys: Set<KeyEquivalent> = [
        .downArrow, .upArrow, .leftArrow, .rightArrow, .return, .space, .escape,
    ]

    private func pick(_ day: Date) {
        date = Self.keepingTime(of: date, onDayOf: day)
        text = EventFormDateFormat.formatLabel(for: date)
        showsCalendar = false
    }

    /// Web `react-datepicker` keys while the calendar is open.
    private func handleCalendarKey(_ press: KeyPress) -> KeyPress.Result {
        guard showsCalendar, let key = Self.calendarKey(press.key) else { return .ignored }
        switch EventFormDateFieldKeys.calendarAction(for: key) {
        case .moveCursor(let days):
            guard let moved = EffectiveTimeZone.calendar.date(byAdding: .day, value: days, to: cursor ?? date) else {
                return .ignored
            }
            cursor = moved
            pickerMonth = moved
        case .pickCursor:
            pick(cursor ?? date)
        case .close:
            showsCalendar = false
        }
        return .handled
    }

    private static func calendarKey(_ key: KeyEquivalent) -> EventFormDateFieldKeys.CalendarKey? {
        switch key {
        case .leftArrow: .leftArrow
        case .rightArrow: .rightArrow
        case .upArrow: .upArrow
        case .downArrow: .downArrow
        case .return: .enter
        case .space: .space
        case .escape: .escape
        default: nil
        }
    }

    /// Web `EventFormDateField.handleKeyDown` on the closed field.
    private func handleKey(_ press: KeyPress) -> KeyPress.Result {
        if showsCalendar { return handleCalendarKey(press) }
        guard let key = Self.fieldKey(press.key) else { return .ignored }
        var modifiers: EventFormDateFieldKeys.Modifiers = []
        if press.modifiers.contains(.shift) { modifiers.insert(.shift) }
        if !press.modifiers.isDisjoint(with: [.command, .control, .option]) { modifiers.insert(.mod) }
        switch EventFormDateFieldKeys.action(for: key, modifiers: modifiers, text: text, committedDate: date) {
        case .openCalendar:
            revertTextToBoundDate()
            showsCalendar = true
            return .handled
        case .nudgeDays(let days):
            guard let nudged = EffectiveTimeZone.calendar.date(byAdding: .day, value: days, to: date) else {
                return .ignored
            }
            date = nudged
            text = EventFormDateFormat.formatLabel(for: nudged)
            return .handled
        case .ignore:
            return .ignored
        }
    }

    private static func fieldKey(_ key: KeyEquivalent) -> EventFormDateFieldKeys.Key? {
        switch key {
        case .downArrow: .downArrow
        case .upArrow: .upArrow
        case .return: .enter
        case .space: .space
        default: nil
        }
    }

    private func commitTypedDate() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            revertTextToBoundDate()
            return
        }
        if let parsed = EventFormDateFormat.parseTypedLabel(trimmed, now: date) {
            date = parsed
            text = EventFormDateFormat.formatLabel(for: parsed)
            return
        }
        revertTextToBoundDate()
    }

    private func revertTextToBoundDate() {
        text = EventFormDateFormat.formatLabel(for: date)
    }
}
