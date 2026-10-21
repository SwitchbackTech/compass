import SwiftUI

struct PageJumpChipAnchorKey: PreferenceKey {
    static let defaultValue: [String: Anchor<CGRect>] = [:]

    static func reduce(
        value: inout [String: Anchor<CGRect>],
        nextValue: () -> [String: Anchor<CGRect>]
    ) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

extension View {
    /// Merges into the anchors from nested views. A plain `anchorPreference`
    /// would replace them, so an anchor on a container (the sidebar) hid the
    /// chips of the targets inside it (month picker, Up next).
    func pageJumpChipAnchor(id: String) -> some View {
        transformAnchorPreference(key: PageJumpChipAnchorKey.self, value: .bounds) { anchors, anchor in
            anchors[id] = anchor
        }
    }
}
