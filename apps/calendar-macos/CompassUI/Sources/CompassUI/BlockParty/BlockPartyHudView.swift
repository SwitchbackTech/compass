import CompassKit
import SwiftUI

struct BlockPartyHudView: View {
    @Environment(\.nativeWebTheme) private var theme
    let game: BlockPartyState
    let task: BlockPartyTask?
    let remainingSeconds: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                if game.timed {
                    Text(formatClock(game.buzzer == nil ? remainingSeconds : 0))
                        .font(.rubik(18))
                        .foregroundStyle(game.buzzer == nil ? theme.textColor : theme.errorColor)
                    if game.buzzer != nil {
                        Text("overtime")
                            .font(.rubik(11))
                            .foregroundStyle(theme.errorColor)
                    }
                } else {
                    Text("Practice")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                        .textCase(.uppercase)
                }
                Spacer()
                Text("\(game.score)")
                    .font(.rubik(18))
                    .foregroundStyle(theme.textColor)
                    .accessibilityIdentifier("block-party-score")
            }

            if let task {
                Text("Task \(game.taskIndex + 1)/\(game.runTasks.count)")
                    .font(.rubik(11))
                    .foregroundStyle(theme.accentColor)
                    .textCase(.uppercase)
                Text(task.title)
                    .font(.rubik(20))
                    .foregroundStyle(theme.textColor)
                Text(task.instruction)
                    .font(.rubik(13))
                    .foregroundStyle(theme.textMutedColor)
                HStack(spacing: 6) {
                    ForEach(BlockPartyEngine.getDisplayKeycaps(task: task, state: game), id: \.self) { cap in
                        ShortcutHintChip(label: cap)
                    }
                }
            }
        }
    }

    private func formatClock(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remainder = seconds % 60
        return String(format: "%d:%02d", minutes, remainder)
    }
}
