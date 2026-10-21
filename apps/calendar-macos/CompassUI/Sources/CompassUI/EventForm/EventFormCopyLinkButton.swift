import CompassKit
import SwiftUI

/// Web `CopyButton`: copy icon with optional inline keycaps beside the event form meeting link.
struct EventFormCopyLinkButton: View {
    let label: String
    let shortcutKeycaps: [String]
    let isEnabled: Bool
    let onCopy: () -> Void

    @State private var copied = false

    var body: some View {
        HStack(spacing: 4) {
            Button(action: copy) {
                Group {
                    if copied {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .medium))
                    } else {
                        PhosphorIconView(icon: .copy, size: 16)
                    }
                }
                .frame(width: 16, height: 16)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .opacity(isEnabled ? (copied ? 1 : 0.25) : 0.15)
            .disabled(!isEnabled)
            .accessibilityLabel(copied ? "Copied" : label)
            .accessibilityIdentifier("compass-event-form-meeting-link-copy")

            if !shortcutKeycaps.isEmpty {
                HStack(spacing: 4) {
                    ForEach(shortcutKeycaps, id: \.self) { key in
                        ShortcutHintChip(label: KeycapGlyphs.display([key]))
                    }
                }
                .opacity(isEnabled ? 0.25 : 0.15)
                .accessibilityHidden(true)
            }
        }
    }

    private func copy() {
        guard isEnabled else { return }
        onCopy()
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            copied = false
        }
    }
}
