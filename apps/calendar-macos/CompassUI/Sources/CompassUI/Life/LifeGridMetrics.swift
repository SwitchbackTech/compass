import CompassKit
import Foundation

struct LifeGridMetrics {
  static let rowHeight: CGFloat = 10
  static let ageWidth: CGFloat = 28
  static let columnGap: CGFloat = 8
  let width: CGFloat

  var weekWidth: CGFloat {
    max(
      0,
      (width - Self.ageWidth - Self.columnGap - CGFloat(LifeMath.weeksPerRow - 1))
        / CGFloat(LifeMath.weeksPerRow))
  }
  var dotSize: CGFloat { min(8, weekWidth) }

  func dotRect(row: Int, week: Int) -> CGRect {
    CGRect(
      x: Self.ageWidth + Self.columnGap + CGFloat(week) * (weekWidth + 1) + (weekWidth - dotSize)
        / 2,
      y: CGFloat(row) * Self.rowHeight + (Self.rowHeight - dotSize) / 2,
      width: dotSize, height: dotSize)
  }
}
