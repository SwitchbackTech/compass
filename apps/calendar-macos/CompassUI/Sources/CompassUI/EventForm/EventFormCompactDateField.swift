import CompassData
import CompassKit
import SwiftUI

struct EventFormCompactDateField: View {
    @Environment(\.nativeWebTheme) private var theme
    @Binding var date: Date
    let accessibilityIdentifier: String
    @State private var text: String
    @State private var showsCalendar = false
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
            .frame(minWidth: 96, maxWidth: 108)
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
                DatePicker(
                    "Pick date",
                    selection: Binding(
                        get: { date },
                        set: { newDate in
                            date = newDate
                            text = EventFormDateFormat.formatLabel(for: newDate)
                        }
                    ),
                    displayedComponents: [.date]
                )
                .datePickerStyle(.graphical)
                .labelsHidden()
                .padding(12)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("compass-event-form-date-picker")
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
