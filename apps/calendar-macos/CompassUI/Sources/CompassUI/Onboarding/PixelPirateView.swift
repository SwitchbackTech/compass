import SwiftUI

/// Web `PixelPirate`: a 16x16 pixel pirate cheering, hat in the theme accent.
struct PixelPirateView: View {
    @Environment(\.nativeWebTheme) private var theme

    private struct Pixel {
        let x: Int, y: Int, width: Int, height: Int, color: Color
    }

    var body: some View {
        let hat = theme.accentColor
        let skin = Color(red: 0xF4 / 255.0, green: 0xD7 / 255.0, blue: 0xB5 / 255.0)
        let dark = Color(red: 0x0D / 255.0, green: 0x10 / 255.0, blue: 0x17 / 255.0)
        let beard = Color(red: 0x8B / 255.0, green: 0x5E / 255.0, blue: 0x3C / 255.0)
        let white = Color(red: 0xE6 / 255.0, green: 0xED / 255.0, blue: 0xF3 / 255.0)
        let shirt = Color(red: 0xC2 / 255.0, green: 0xC6 / 255.0, blue: 0xCC / 255.0)
        let pixels = [
            // Hat with skull mark
            Pixel(x: 4, y: 0, width: 8, height: 1, color: hat),
            Pixel(x: 3, y: 1, width: 10, height: 1, color: hat),
            Pixel(x: 2, y: 2, width: 12, height: 1, color: hat),
            Pixel(x: 3, y: 3, width: 10, height: 1, color: hat),
            Pixel(x: 7, y: 1, width: 2, height: 1, color: white),
            // Face with eyepatch strap, patch, and right eye
            Pixel(x: 4, y: 4, width: 8, height: 5, color: skin),
            Pixel(x: 4, y: 5, width: 8, height: 1, color: dark),
            Pixel(x: 5, y: 5, width: 2, height: 2, color: dark),
            Pixel(x: 9, y: 6, width: 1, height: 1, color: dark),
            // Beard
            Pixel(x: 4, y: 9, width: 8, height: 1, color: beard),
            Pixel(x: 5, y: 10, width: 6, height: 1, color: beard),
            // Shirt with belt
            Pixel(x: 4, y: 11, width: 8, height: 1, color: shirt),
            Pixel(x: 5, y: 12, width: 6, height: 1, color: shirt),
            Pixel(x: 5, y: 13, width: 6, height: 1, color: dark),
            // Legs
            Pixel(x: 6, y: 14, width: 1, height: 1, color: dark),
            Pixel(x: 9, y: 14, width: 1, height: 1, color: dark),
            // Raised cheering arms
            Pixel(x: 3, y: 10, width: 1, height: 1, color: skin),
            Pixel(x: 2, y: 8, width: 1, height: 2, color: skin),
            Pixel(x: 12, y: 10, width: 1, height: 1, color: skin),
            Pixel(x: 13, y: 8, width: 1, height: 2, color: skin),
        ]
        Canvas { context, size in
            let unit = min(size.width, size.height) / 16
            for pixel in pixels {
                let rect = CGRect(
                    x: CGFloat(pixel.x) * unit,
                    y: CGFloat(pixel.y) * unit,
                    width: CGFloat(pixel.width) * unit,
                    height: CGFloat(pixel.height) * unit
                )
                context.fill(Path(rect), with: .color(pixel.color))
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Pixel pirate cheering")
        .accessibilityAddTraits(.isImage)
    }
}
