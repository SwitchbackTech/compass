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
    @FocusState private var isFocused: Bool

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
            .onKeyPress(keys: [.downArrow, .upArrow, .return, .space]) { press in
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
                    onSelectDate: { picked in
                        date = Self.keepingTime(of: date, onDayOf: picked)
                        text = EventFormDateFormat.formatLabel(for: date)
                        showsCalendar = false
                    },
                    today: Date(),
                    daysAreClickable: true
                )
                .frame(width: 252)
                .padding(12)
                .background(theme.surfacePanelColor)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("compass-event-form-date-picker")
                .onAppear { pickerMonth = date }
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

    /// Web `EventFormDateField.handleKeyDown` on the closed field.
    private func handleKey(_ press: KeyPress) -> KeyPress.Result {
        guard !showsCalendar, let key = Self.fieldKey(press.key) else { return .ignored }
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
