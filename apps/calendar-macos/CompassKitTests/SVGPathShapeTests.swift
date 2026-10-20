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

    func testAllExportedPhosphorIconsBuildPaths() {
        let rect = CGRect(x: 0, y: 0, width: 18, height: 18)
        for icon in PhosphorIcon.allCases {
            let path = SVGPathShape(pathData: icon.pathData).path(in: rect)
            XCTAssertFalse(path.isEmpty, "Expected non-empty path for \(icon.rawValue)")
        }
    }
}
