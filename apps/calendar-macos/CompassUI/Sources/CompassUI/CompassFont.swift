import AppKit
import SwiftUI

/// Rubik weights the web uses (`font-normal`, `font-medium`, `font-semibold`, `font-bold`).
public enum RubikWeight: CGFloat, Sendable {
    case regular = 400
    case medium = 500
    case semibold = 600
    case bold = 700
}

/// The app's one font lookup, so native text matches the web's Rubik.
///
/// Rubik ships as a single variable font whose default instance is Light (300),
/// and no face is named plain "Rubik". `NSFont(name: "Rubik")` therefore misses
/// and falls back to the system font, and a bare family lookup can land on
/// Light. Resolve by family and pin the `wght` axis instead.
public enum CompassFont {
    private static var weightAxis: NSNumber { NSNumber(value: 0x7767_6874) }  // 'wght'

    public static func nsFont(size: CGFloat, weight: RubikWeight = .regular) -> NSFont {
        let descriptor = NSFontDescriptor(fontAttributes: [
            .family: "Rubik",
            .variation: [weightAxis: NSNumber(value: Double(weight.rawValue))],
        ])
        if let font = NSFont(descriptor: descriptor, size: size), font.familyName == "Rubik" {
            return font
        }
        return .systemFont(ofSize: size, weight: systemWeight(weight))
    }

    private static func systemWeight(_ weight: RubikWeight) -> NSFont.Weight {
        switch weight {
        case .regular: .regular
        case .medium: .medium
        case .semibold: .semibold
        case .bold: .bold
        }
    }
}

extension Font {
    /// Rubik at `size` points, matching the web's `font-sans`.
    public static func rubik(_ size: CGFloat, weight: RubikWeight = .regular) -> Font {
        Font(CompassFont.nsFont(size: size, weight: weight) as CTFont)
    }
}
