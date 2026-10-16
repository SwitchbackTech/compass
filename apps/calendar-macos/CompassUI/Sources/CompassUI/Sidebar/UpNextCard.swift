import CompassData
import CompassKit
import SwiftUI

struct UpNextCard: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    let onOpen: () -> Void

    var body: some View {
        let state = model.upNextState
        let snapshot = state.snapshot
        Group {
            if let presentation = UpNextFormatting.resolve(state) {
                let upNext = presentation.upNext
                let countdown = presentation.countdown
                VStack(alignment: .leading, spacing: 2) {
                    Text(snapshot.isCurrentEvent ? "Now" : countdown)
                        .font(.rubik(12))
                        .foregroundStyle(theme.accentColor)
                        .allowsHitTesting(false)
                    Text(upNext.title)
                        .font(.rubik(14, weight: .medium))
                        .foregroundStyle(theme.textColor)
                        .lineLimit(1)
                        .allowsHitTesting(false)
                    if state.conferenceURL != nil {
                        Button { model.joinUpNextMeeting() } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "video.fill")
                                    .font(.system(size: 10))
                                Text("Join")
                                    .font(.rubik(12))
                            }
                            .foregroundStyle(theme.accentColor)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Join \(upNext.title)")
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background {
                    Button(action: onOpen) {
                        RoundedRectangle(cornerRadius: 4).fill(theme.surfaceColor)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        "\(snapshot.isCurrentEvent ? "Now" : "Up next"): \(upNext.title). \(countdown).")
                }
                .accessibilityIdentifier("compass-native-up-next-card")
            } else {
                Text("All clear")
                    .font(.rubik(14, weight: .medium))
                    .foregroundStyle(theme.textMutedColor)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(theme.surfaceColor)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .accessibilityIdentifier("compass-native-up-next-empty")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Up next")
        .accessibilityIdentifier("compass-native-up-next")
    }
}
