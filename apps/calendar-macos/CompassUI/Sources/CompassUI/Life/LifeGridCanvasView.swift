import CompassData
import CompassKit
import SwiftUI

struct LifeGridCanvasView: View {
  @Environment(\.nativeWebTheme) private var theme
  let snapshot: LifeGridSnapshot
  let currentWeekLabel: String?
  let scrollToCurrentWeekToken: Int

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @FocusState private var currentWeekFocused: Bool

  var body: some View {
    GeometryReader { geometry in
      ScrollViewReader { proxy in
        ScrollView {
          Canvas { context, size in
            drawGrid(context: &context, size: size)
          }
          .frame(height: gridHeight)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("Life visualization")
          .accessibilityValue(currentWeekLabel ?? snapshotSummary)
          .accessibilityIdentifier("compass-native-life-grid")
          .overlay(alignment: .topLeading) {
            if let index = snapshot.dots.firstIndex(of: .current), let currentWeekLabel {
              let rect = LifeGridMetrics(width: geometry.size.width).dotRect(
                row: index / LifeMath.weeksPerRow, week: index % LifeMath.weeksPerRow)
              Button {
                currentWeekFocused = true
              } label: {
                RoundedRectangle(cornerRadius: 2)
                  .fill(Color.clear)
                  .overlay {
                    if currentWeekFocused {
                      RoundedRectangle(cornerRadius: 2).stroke(theme.accentColor, lineWidth: 2)
                        .padding(-2)
                    }
                  }
              }
              .buttonStyle(.plain)
              .focusEffectDisabled()
              .frame(width: max(1, rect.width), height: LifeGridMetrics.rowHeight)
              .position(x: rect.midX, y: rect.midY)
              .id("life-current-week-anchor")
              .focused($currentWeekFocused)
              .accessibilityLabel(currentWeekLabel)
              .help(currentWeekLabel)
            }
          }
        }
        .onChange(of: scrollToCurrentWeekToken) { _, _ in
          withAnimation(reduceMotion ? nil : .default) {
            proxy.scrollTo("life-current-week-anchor", anchor: .center)
          }
          currentWeekFocused = true
        }
      }
    }
  }

  private var snapshotSummary: String {
    "total \(snapshot.totalDots), lived \(snapshot.weeksLived)"
  }

  private var gridHeight: CGFloat {
    CGFloat(snapshot.rowCount) * LifeGridMetrics.rowHeight
  }

  private func drawGrid(context: inout GraphicsContext, size: CGSize) {
    let metrics = LifeGridMetrics(width: size.width)
    let livedColor = theme.accentColor
    let futureColor = theme.textColor.opacity(0.15)
    let currentRing = theme.accentColor.opacity(0.6)

    for row in 0..<snapshot.rowCount {
      let age = row + 1
      if age == 1 || age % 10 == 0 {
        let label = Text(verbatim: "\(age)")
          .font(.rubik(10).monospacedDigit())
          .foregroundColor(theme.textMutedColor.opacity(0.7))
        context.draw(
          label,
          at: CGPoint(
            x: LifeGridMetrics.ageWidth,
            y: CGFloat(row) * LifeGridMetrics.rowHeight + LifeGridMetrics.rowHeight / 2),
          anchor: .trailing)
      }

      for week in 0..<LifeMath.weeksPerRow {
        let index = row * LifeMath.weeksPerRow + week
        guard index < snapshot.dots.count else { continue }
        let state = snapshot.dots[index]
        let rect = metrics.dotRect(row: row, week: week)
        let path = Path(roundedRect: rect, cornerRadius: 2)
        switch state {
        case .future:
          context.fill(path, with: .color(futureColor))
        case .lived:
          context.fill(path, with: .color(livedColor))
        case .current:
          context.fill(path, with: .color(livedColor))
          context.stroke(path, with: .color(currentRing), lineWidth: 1)
        }
      }
    }
  }
}
