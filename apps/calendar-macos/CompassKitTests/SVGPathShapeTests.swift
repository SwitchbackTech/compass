import SwiftUI
import XCTest
@testable import CompassKit

final class SVGPathShapeTests: XCTestCase {
    func testPhosphorPlusPathBuildsNonEmptyShape() {
        let shape = SVGPathShape(pathData: PhosphorIcon.plus.pathData)
        let rect = CGRect(x: 0, y: 0, width: 18, height: 18)
        let path = shape.path(in: rect)
        XCTAssertFalse(path.isEmpty)
    }
}
