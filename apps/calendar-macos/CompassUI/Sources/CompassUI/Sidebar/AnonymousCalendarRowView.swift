import CompassKit
import SwiftUI

struct AnonymousCalendarRowView: View {
    @Environment(\.nativeWebTheme) private var theme
    let calendar: CompassCalendar
    let onStartTrial: () -> Void
    @State private var showsInfo = false

    var body: some View {
        Button { showsInfo.toggle() } label: {
            HStack(spacing: 8) {
                Circle()
                    .fill(
                        EventCardColorParser.nsColor(hex: calendar.backgroundColor).map(Color.init(nsColor:))
                            ?? theme.textColor
                    )
                    .overlay {
                        Circle()
                            .strokeBorder(
                                EventCardColorParser.nsColor(hex: calendar.backgroundColor).map(Color.init(nsColor:))
                                    ?? theme.textColor,
                                lineWidth: 2
                            )
                    }
                    .frame(width: 14, height: 14)
                Text("On this device only")
                    .font(.rubik(12))
                    .foregroundStyle(theme.textMutedColor)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Start your free trial to save this calendar")
        .help("Events stay on this Mac until you connect an account.")
        .popover(isPresented: $showsInfo, arrowEdge: .bottom) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Events stay on this Mac until you connect an account.")
                Text("Start your free trial to sync")
                Button("Start free trial") {
                    showsInfo = false
                    onStartTrial()
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.accentColor)
            }
            .font(.rubik(12))
            .foregroundStyle(theme.textColor)
            .padding(12)
            .frame(width: 240, alignment: .leading)
            .background(theme.surfaceColor)
        }
    }
}
