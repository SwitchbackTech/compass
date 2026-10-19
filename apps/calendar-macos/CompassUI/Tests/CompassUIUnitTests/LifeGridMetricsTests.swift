import CompassKit
import XCTest
@testable import CompassUI

final class LifeGridMetricsTests: XCTestCase {
    func testDotsSpreadAcrossTheTrackInsteadOfStoppingAtAFixedWidth() {
        for width in [CGFloat(320), 600, 1200] {
            let metrics = LifeGridMetrics(width: width)
            let first = metrics.dotRect(row: 0, week: 0)
            let last = metrics.dotRect(row: 0, week: LifeMath.weeksPerRow - 1)
            XCTAssertGreaterThanOrEqual(first.minX, LifeGridMetrics.ageWidth + LifeGridMetrics.columnGap)
            XCTAssertLessThanOrEqual(last.maxX, width + 0.001)
            XCTAssertEqual(width - last.maxX, first.minX - 36, accuracy: 0.001)
            XCTAssertLessThanOrEqual(first.width, 8)
            XCTAssertEqual(first.width, first.height)
            XCTAssertEqual(metrics.dotRect(row: 20, week: 0).minY - first.minY, 200, accuracy: 0.001)
        }
        XCTAssertGreaterThan(LifeGridMetrics(width: 1200).dotRect(row: 0, week: 51).minX, 1100)
    }
}
