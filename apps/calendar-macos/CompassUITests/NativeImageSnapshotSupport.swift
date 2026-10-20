import AppKit
import XCTest

enum NativeImageSnapshotSupport {
    static let recordSnapshots = ProcessInfo.processInfo.environment["RECORD_SNAPSHOTS"] == "1"
    /// Export PNGs for web parity comparison (no ReferenceImages assert).
    static var parityCapture: Bool {
        if ProcessInfo.processInfo.environment["PARITY_CAPTURE"] == "1" { return true }
        return ProcessInfo.processInfo.arguments.contains("-PARITY_CAPTURE")
    }

    static var parityOutputDirectory: String? {
        if let dir = ProcessInfo.processInfo.environment["PARITY_OUTPUT_DIR"], !dir.isEmpty {
            return dir
        }
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-PARITY_OUTPUT_DIR"), index + 1 < args.count {
            return args[index + 1]
        }
        return nil
    }

    @MainActor
    static func captureWindow(_ window: XCUIElement, named name: String, file: StaticString = #filePath, line: UInt = #line) {
        guard window.waitForExistence(timeout: 15) else {
            XCTFail("Window missing for snapshot \(name)", file: file, line: line)
            return
        }

        if parityCapture, let png = exportParitySnapshot(window: window, named: name, file: file, line: line) {
            attachPNG(png, named: name)
            return
        }

        let screenshot = window.screenshot()
        attachPNG(screenshot.pngRepresentation, named: name)

        guard let referenceURL = referenceImageURL(named: name) else {
            XCTFail("Could not resolve ReferenceImages bundle path for \(name)", file: file, line: line)
            return
        }

        if recordSnapshots {
            do {
                try FileManager.default.createDirectory(
                    at: referenceURL.deletingLastPathComponent(),
                    withIntermediateDirectories: true)
                try screenshot.pngRepresentation.write(to: referenceURL)
            } catch {
                XCTFail("Failed to record snapshot \(name): \(error)", file: file, line: line)
            }
            return
        }

        guard FileManager.default.fileExists(atPath: referenceURL.path) else {
            return
        }
        do {
            let reference = try Data(contentsOf: referenceURL)
            XCTAssertEqual(
                screenshot.pngRepresentation,
                reference,
                "Snapshot \(name) differs from ReferenceImages/\(name).png. Re-record with the record-macos-snapshots workflow.",
                file: file,
                line: line)
        } catch {
            XCTFail("Failed to load reference snapshot \(name): \(error)", file: file, line: line)
        }
    }

    @MainActor
    private static func exportParitySnapshot(
        window: XCUIElement,
        named name: String,
        file: StaticString,
        line: UInt
    ) -> Data? {
        guard let outDir = parityOutputDirectory else {
            XCTFail("PARITY_OUTPUT_DIR is required for view-level parity export", file: file, line: line)
            return nil
        }
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
        guard let url = URL(string: "compass://debug/parity-export?name=\(encoded)") else {
            XCTFail("Invalid parity export URL for \(name)", file: file, line: line)
            return nil
        }
        NSWorkspace.shared.open(url)

        let fileURL = URL(fileURLWithPath: outDir, isDirectory: true).appendingPathComponent("\(name).png")
        let exportedValue = "parity-exported:\(name)"
        let deadline = Date().addingTimeInterval(15)
        while Date() < deadline {
            if window.value as? String == exportedValue, FileManager.default.fileExists(atPath: fileURL.path) {
                if let data = try? Data(contentsOf: fileURL), !data.isEmpty {
                    return data
                }
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        XCTFail("Timed out waiting for parity export \(name) at \(fileURL.path)", file: file, line: line)
        return nil
    }

    /// Full-window title bar PNG (traffic lights + nav); written by the app process during parity capture.
    @MainActor
    static func exportMacTitleBarReference(
        _ window: XCUIElement,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard parityCapture else { return }
        guard let png = exportParityTitleBarSnapshot(window: window, file: file, line: line) else { return }
        attachPNG(png, named: "mac-title-bar")
    }

    @MainActor
    private static func exportParityTitleBarSnapshot(
        window: XCUIElement,
        file: StaticString,
        line: UInt
    ) -> Data? {
        guard let outDir = parityOutputDirectory else {
            XCTFail("PARITY_OUTPUT_DIR is required for title bar parity export", file: file, line: line)
            return nil
        }
        guard let url = URL(string: "compass://debug/parity-title-bar-export") else {
            XCTFail("Invalid parity title bar export URL", file: file, line: line)
            return nil
        }
        NSWorkspace.shared.open(url)

        let fileURL = URL(fileURLWithPath: outDir, isDirectory: true).appendingPathComponent("mac-title-bar.png")
        let exportedValue = "parity-exported:mac-title-bar"
        let deadline = Date().addingTimeInterval(15)
        while Date() < deadline {
            if window.value as? String == exportedValue, FileManager.default.fileExists(atPath: fileURL.path) {
                if let data = try? Data(contentsOf: fileURL), !data.isEmpty {
                    return data
                }
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        XCTFail("Timed out waiting for mac-title-bar.png at \(fileURL.path)", file: file, line: line)
        return nil
    }

    @MainActor
    private static func attachPNG(_ data: Data, named name: String) {
        let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.png")
        attachment.name = name
        attachment.lifetime = .keepAlways
        XCTContext.runActivity(named: "Snapshot \(name)") { activity in
            activity.add(attachment)
        }
    }

    private static func referenceImageURL(named name: String) -> URL? {
        let testBundle = Bundle(for: BundleLocator.self)
        guard let resourceURL = testBundle.resourceURL else { return nil }
        return resourceURL.appendingPathComponent("ReferenceImages/\(name).png")
    }

    private final class BundleLocator {}
}
