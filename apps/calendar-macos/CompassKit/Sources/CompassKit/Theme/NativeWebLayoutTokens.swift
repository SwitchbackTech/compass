import CoreGraphics

/// Layout tokens mirrored from the web theme (radius, type, and blur scales).
public enum NativeWebLayoutTokens {
    public static let radiusDefault: CGFloat = 4
    public static let radiusPanel: CGFloat = 12
    /// Tailwind `--blur-sm`, used by web `backdrop-blur-sm`.
    public static let blurSmall: CGFloat = 8

    public static let fontSizeXS: CGFloat = 9
    public static let fontSizeS: CGFloat = 11
    public static let fontSizeM: CGFloat = 13
    public static let fontSizeBody: CGFloat = 14
    public static let fontSizeL: CGFloat = 16
    public static let fontSizeXL: CGFloat = 18
}
