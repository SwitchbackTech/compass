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
        VStack(alignment: .leading, spacing: 8) {
            Text("Up next")
                .font(.rubik(13))
                .foregroundStyle(theme.textMutedColor)
                .accessibilityIdentifier("compass-native-up-next")
            if let presentation = UpNextFormatting.resolve(state) {
                let upNext = presentation.upNext
                let countdown = presentation.countdown
                VStack(alignment: .leading, spacing: 4) {
                    Text(snapshot.isCurrentEvent ? "Now" : countdown)
                        .font(.rubik(12))
                        .foregroundStyle(theme.accentColor)
                    Text(upNext.title)
                        .font(.rubik(14, weight: .medium))
                        .foregroundStyle(theme.textColor)
                        .lineLimit(1)
                    if state.conferenceURL != nil {
                        HStack(spacing: 4) {
                            Image(systemName: "video.fill")
                                .font(.system(size: 10))
                            Text("Join")
                                .font(.rubik(12))
                        }
                        .foregroundStyle(theme.accentColor)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(theme.surfaceColor)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay {
                    Button(action: onOpen) {
                        Color.clear
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
                    .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(theme.surfaceColor)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .accessibilityIdentifier("compass-native-up-next-empty")
            }
        }
    }
}
