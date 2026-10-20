import Foundation

/// Geometry for desktop ↔ web parity screenshots. Keep in sync with
/// `e2e/parity/seed-demo-fixture.util.ts` and `apps/calendar-web/src/index.html`
/// boot track math (1280×820, sidebar open @ 345px, content pl-8).
public enum ParityCaptureGeometry {
    public static let viewportWidth: Double = 1280
    public static let contentLeadingInset: Double = 32
    public static let sidebarDividerWidth: Double = 32
    public static let defaultSidebarWidth: Double = 345
    public static let gridMarginLeft: Double = Double(GridMetrics.gridMarginLeft)

    /// Width of the week grid track (excluding sidebar chrome).
    public static var contentTrackWidth: Double {
        viewportWidth - contentLeadingInset - (sidebarDividerWidth + defaultSidebarWidth)
    }

    public static var visibleDayCount: Int {
        CalendarWindowMath.computeVisibleDayCount(
            trackWidth: contentTrackWidth,
            marginLeft: gridMarginLeft
        )
    }
}
