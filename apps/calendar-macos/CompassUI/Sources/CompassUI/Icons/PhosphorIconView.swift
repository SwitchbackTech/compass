import AppKit
import CompassData
import CompassKit
import SwiftUI

public struct PhosphorIconView: View {
    public let icon: PhosphorIcon
    public var size: CGFloat = 18
    public var color: Color?
    /// Web mirrors `SidebarSimple` when the panel sits on the right.
    public var mirrored: Bool = false

    public init(
        icon: PhosphorIcon,
        size: CGFloat = 18,
        color: Color? = nil,
        mirrored: Bool = false
    ) {
        self.icon = icon
        self.size = size
        self.color = color
        self.mirrored = mirrored
    }

    @Environment(\.nativeWebTheme) private var theme

    public var body: some View {
        let resolved = color ?? theme.textMutedColor
        let vector = SVGPathShape(pathData: icon.pathData)
            .fill(resolved)
            .frame(width: size, height: size)
            .scaleEffect(x: mirrored ? -1 : 1, y: 1)

        if UITestLaunchPolicy.isParityCapture,
           let image = Self.rasterize(content: vector, size: size)
        {
            Image(nsImage: image)
                .resizable()
                .interpolation(.high)
                .antialiased(true)
                .frame(width: size, height: size)
        } else {
            vector
        }
    }

    private static func rasterize<Content: View>(content: Content, size: CGFloat) -> NSImage? {
        let renderer = ImageRenderer(
            content: content.frame(width: size, height: size)
        )
        renderer.scale = 2
        return renderer.nsImage
    }
}
