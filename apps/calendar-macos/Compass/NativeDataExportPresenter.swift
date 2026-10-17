import AppKit
import UniformTypeIdentifiers

@MainActor
struct NativeDataExportPresenter {
    static func save(_ data: Data, filename: String, window: NSWindow) async throws -> Bool {
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.json]
        panel.nameFieldStringValue = filename
        panel.canCreateDirectories = true
        panel.title = "Export data"
        panel.message = "Export user-created events stored on this Mac. Synced calendar caches and sample events are excluded."
        let response = await withCheckedContinuation { continuation in
            panel.beginSheetModal(for: window) { continuation.resume(returning: $0) }
        }
        guard response == .OK, let url = panel.url else { return false }
        try await Task.detached { try data.write(to: url, options: .atomic) }.value
        return true
    }
}
