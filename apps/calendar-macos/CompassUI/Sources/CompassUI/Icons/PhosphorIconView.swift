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

        if UITestLaunchPolicy.isParityCapture {
            MacRasterizedIcon(size: size, content: vector)
        } else {
            vector
        }
    }
}

/// Vector `Shape` fills can be absent from `screencapture`/XCUITest window PNGs while
/// accessibility still reports the control. Rasterize to an `NSImage` on macOS.
private struct MacRasterizedIcon<Content: View>: View {
    let size: CGFloat
    let content: Content
    @State private var image: NSImage?

    var body: some View {
        Group {
            if let image {
                Image(nsImage: image)
                    .resizable()
                    .interpolation(.high)
                    .antialiased(true)
                    .frame(width: size, height: size)
            } else {
                Color.clear
                    .frame(width: size, height: size)
                    .onAppear(perform: render)
            }
        }
    }

    private func render() {
        let renderer = ImageRenderer(
            content: content.frame(width: size, height: size)
        )
        renderer.scale = 2
        image = renderer.nsImage
    }
}
