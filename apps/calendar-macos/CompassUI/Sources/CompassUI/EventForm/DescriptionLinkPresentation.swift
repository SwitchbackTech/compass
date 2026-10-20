import Foundation

enum DescriptionLinkPresentation {
    static func displayHost(for url: String) -> String {
        guard let host = URL(string: url)?.host else { return url }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    static func shouldShortenVisibleLabel(text: String, href: String) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !href.isEmpty, !trimmed.contains(" ") else { return false }
        func withoutTrail(_ value: String) -> String {
            value.replacingOccurrences(of: "[.,)>]+$", with: "", options: .regularExpression)
        }
        if let parsed = URL(string: href) {
            let normalizedHref = withoutTrail(parsed.absoluteString)
            let normalizedText = withoutTrail(trimmed)
            if normalizedText == normalizedHref || normalizedText == withoutTrail(href) {
                return true
            }
        }
        return trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") || trimmed.hasPrefix("www.")
    }

    static func linkHrefs(in html: String) -> [String] {
        let document = HTMLFragmentDocument.parse(html)
        var hrefs: [String] = []
        func walkInlines(_ inlines: [HTMLFragmentInline]) {
            for inline in inlines {
                switch inline {
                case .link(let href, let children):
                    hrefs.append(href)
                    walkInlines(children)
                case .bold(let children), .italic(let children):
                    walkInlines(children)
                case .text, .lineBreak:
                    break
                }
            }
        }
        for block in document.blocks {
            switch block {
            case .paragraph(let inlines):
                walkInlines(inlines)
            case .unorderedList(let items), .orderedList(let items):
                for item in items { walkInlines(item.inlines) }
            case .verbatim:
                break
            }
        }
        return hrefs
    }
}
