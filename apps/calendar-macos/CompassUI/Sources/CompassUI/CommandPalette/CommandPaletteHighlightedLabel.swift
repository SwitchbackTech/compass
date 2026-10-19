import CompassKit
import SwiftUI

struct CommandPaletteHighlightedLabel: View {
    @Environment(\.nativeWebTheme) private var theme
    let label: String
    let query: String

    var body: some View {
        Text(attributedLabel)
            .font(.rubik(14))
    }

    private var attributedLabel: AttributedString {
        var result = AttributedString(label)
        result.foregroundColor = theme.textColor
        let ranges = CommandPaletteSearchLogic.labelMatchRanges(label: label, query: query)
        for range in ranges {
            guard range.lowerBound >= 0,
                range.upperBound <= label.count,
                range.lowerBound < range.upperBound
            else { continue }
            let start = label.index(label.startIndex, offsetBy: range.lowerBound)
            let end = label.index(label.startIndex, offsetBy: range.upperBound)
            let lower = start..<end
            if let attrRange = Range(lower, in: result) {
                result[attrRange].font = .rubik(14, weight: .semibold)
                result[attrRange].foregroundColor = theme.accentColor
            }
        }
        return result
    }
}
