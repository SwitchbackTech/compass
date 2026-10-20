import CompassKit
import SwiftUI

public struct PhosphorIconView: View {
    public let icon: PhosphorIcon
    public var size: CGFloat = 18
    public var color: Color?

    public init(icon: PhosphorIcon, size: CGFloat = 18, color: Color? = nil) {
        self.icon = icon
        self.size = size
        self.color = color
    }

    @Environment(\.nativeWebTheme) private var theme

    public var body: some View {
        SVGPathShape(pathData: icon.pathData)
            .fill(color ?? theme.textMutedColor)
            .frame(width: size, height: size)
    }
}
