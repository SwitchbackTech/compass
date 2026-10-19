import Foundation

/// Fuzzy command palette filter and label highlight ranges. Mirrors web `command-palette.search.ts`.
public enum CommandPaletteSearchLogic {
    private static let minSubsequenceTokenLength = 3

    public struct ScoredItem: Hashable, Sendable {
        public let item: CommandPaletteSearchItem
        public let score: Int
    }

    public struct CommandPaletteSearchItem: Hashable, Sendable {
        public let id: String
        public let label: String
        public let keywords: [String]

        public init(id: String, label: String, keywords: [String] = []) {
            self.id = id
            self.label = label
            self.keywords = keywords
        }
    }

    public struct Section: Hashable, Sendable {
        public let id: String
        public let heading: String
        public let items: [CommandPaletteSearchItem]

        public init(id: String, heading: String, items: [CommandPaletteSearchItem]) {
            self.id = id
            self.heading = heading
            self.items = items
        }
    }

    public static func filter(sections: [Section], query: String) -> [Section] {
        let tokens = tokenizeQuery(query)
        if tokens.isEmpty { return sections }

        return sections.compactMap { section in
            if section.id == "go-to-date" { return section }
            let scored = section.items.compactMap { item -> ScoredItem? in
                let score = scoreAgainstTokens(item: item, tokens: tokens)
                guard score > 0 else { return nil }
                return ScoredItem(item: item, score: score)
            }
            .sorted { $0.score > $1.score }
            guard !scored.isEmpty else { return nil }
            return Section(
                id: section.id,
                heading: section.heading,
                items: scored.map(\.item))
        }
    }

    public static func labelMatchRanges(label: String, query: String) -> [Range<Int>] {
        let tokens = tokenizeQuery(query)
        if tokens.isEmpty { return [] }

        let lowerLabel = label.lowercased()
        var ranges: [(Int, Int)] = []
        for token in tokens {
            if let index = lowerLabel.range(of: token)?.lowerBound {
                let start = lowerLabel.distance(from: lowerLabel.startIndex, to: index)
                ranges.append((start, start + token.count))
            }
        }
        if ranges.isEmpty { return [] }

        ranges.sort { $0.0 < $1.0 }
        var merged: [(Int, Int)] = [ranges[0]]
        for (start, end) in ranges.dropFirst() {
            var last = merged[merged.count - 1]
            if start <= last.1 {
                last.1 = max(last.1, end)
                merged[merged.count - 1] = last
            } else {
                merged.append((start, end))
            }
        }
        return merged.map { $0.0..<$0.1 }
    }

    public static func scoreCommandItem(item: CommandPaletteSearchItem, query: String) -> Int {
        let tokens = tokenizeQuery(query)
        if tokens.isEmpty { return 0 }
        return scoreAgainstTokens(item: item, tokens: tokens)
    }

    private static func tokenizeQuery(_ query: String) -> [String] {
        query
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .split(whereSeparator: { $0.isWhitespace })
            .map { normalizeSearchToken(String($0)) }
            .filter { !$0.isEmpty }
    }

    private static func normalizeSearchToken(_ token: String) -> String {
        var t = token.trimmingCharacters(in: CharacterSet(charactersIn: "'\""))
        while t.hasPrefix("'") || t.hasPrefix("\"") { t.removeFirst() }
        while t.hasSuffix("'") || t.hasSuffix("\"") { t.removeLast() }
        return t.replacingOccurrences(of: #"[\.\!?]+$"#, with: "", options: .regularExpression)
    }

    private static func scoreAgainstTokens(item: CommandPaletteSearchItem, tokens: [String]) -> Int {
        let label = item.label.lowercased()
        let keywords = item.keywords.map { $0.lowercased() }
        var total = 0
        for token in tokens {
            let labelTier = scoreToken(haystack: label, token: token)
            let keywordTier = keywords.map { scoreToken(haystack: $0, token: token) }.max() ?? 0
            if labelTier == 0, keywordTier == 0 { return 0 }
            let bestTier = max(labelTier, keywordTier)
            total += bestTier * 2 + (labelTier == bestTier ? 1 : 0)
        }
        return total
    }

    private static func scoreToken(haystack: String, token: String) -> Int {
        if haystack == token { return 5 }
        if haystack.hasPrefix(token) { return 4 }
        if hasWordStartingWith(haystack: haystack, token: token) { return 3 }
        if haystack.contains(token) { return 2 }
        if token.count >= minSubsequenceTokenLength, isSubsequence(haystack: haystack, token: token) {
            return 1
        }
        return 0
    }

    private static func hasWordStartingWith(haystack: String, token: String) -> Bool {
        haystack.split(whereSeparator: { $0.isWhitespace || $0 == "-" })
            .contains { $0.lowercased().hasPrefix(token) }
    }

    private static func isSubsequence(haystack: String, token: String) -> Bool {
        var position = haystack.startIndex
        for char in token {
            guard let idx = haystack[position...].firstIndex(of: char) else { return false }
            position = haystack.index(after: idx)
        }
        return true
    }
}
