import CompassKit
import XCTest

final class ParityCaptureGeometryTests: XCTestCase {
    func testContentTrackWidthMatchesWebBootShell() {
        // index.html: track = innerWidth - 32 - (32 + sidebarWidth)
        XCTAssertEqual(ParityCaptureGeometry.contentTrackWidth, 871, accuracy: 0.1)
        XCTAssertEqual(ParityCaptureGeometry.visibleDayCount, 5)
    }

}
