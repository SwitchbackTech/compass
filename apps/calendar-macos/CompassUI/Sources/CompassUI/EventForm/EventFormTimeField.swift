import CompassData
import CompassKit
import SwiftUI

struct EventFormTimeField: View {
    @Environment(\.nativeWebTheme) private var theme
    @Binding var date: Date
    let accessibilityIdentifier: String
    @State private var showsMenu: Bool

    init(date: Binding<Date>, accessibilityIdentifier: String) {
        _date = date
        self.accessibilityIdentifier = accessibilityIdentifier
        let openPicker = UITestLaunchPolicy.openEventFormTimePickerForUITest
            && accessibilityIdentifier == "compass-event-form-start"
        _showsMenu = State(initialValue: openPicker)
    }

    var body: some View {
        Button {
            showsMenu = true
        } label: {
            HStack(spacing: 6) {
                Text(EventFormTimeFormat.formatLabel(for: date))
                    .font(.rubik(NativeWebLayoutTokens.fontSizeBody))
                    .foregroundStyle(theme.textColor)
                    .lineLimit(1)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(theme.textMutedColor)
            }
            .padding(.horizontal, 8)
            .frame(width: 92)
            .frame(minHeight: 38)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .overlay {
                RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                    .stroke(showsMenu ? theme.accentColor : theme.borderColor, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(accessibilityIdentifier)
        .popover(isPresented: $showsMenu, arrowEdge: .bottom) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(EventFormTimeFormat.quarterHourLabels(), id: \.self) { label in
                        Button {
                            if let merged = EventFormTimeFormat.mergeTime(into: date, label: label) {
                                date = merged
                            }
                            showsMenu = false
                        } label: {
                            Text(label)
                                .font(.rubik(NativeWebLayoutTokens.fontSizeBody))
                                .foregroundStyle(
                                    label == EventFormTimeFormat.formatLabel(for: date)
                                        ? theme.onAccentColor : theme.textColor
                                )
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(
                                    label == EventFormTimeFormat.formatLabel(for: date)
                                        ? theme.accentColor : Color.clear
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(width: 120, height: 220)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("\(accessibilityIdentifier)-menu")
        }
    }
}
