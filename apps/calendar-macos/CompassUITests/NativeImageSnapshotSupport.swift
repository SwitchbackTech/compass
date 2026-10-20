import AppKit
import XCTest

enum NativeImageSnapshotSupport {
    /// AppKit `cacheDisplay` parity export returns a blank frame for some SwiftUI-only surfaces.
    private static let xcuiScreenshotParitySurfaces: Set<String> = ["onboarding-welcome"]

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

        if parityCapture, parityOutputDirectory != nil {
            if xcuiScreenshotParitySurfaces.contains(name) {
                writeParityScreenshot(window: window, named: name, file: file, line: line)
                return
            }
            if let png = exportParitySnapshot(window: window, named: name, file: file, line: line) {
                attachPNG(png, named: name)
                return
            }
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
    private static func writeParityScreenshot(
        window: XCUIElement,
        named name: String,
        file: StaticString,
        line: UInt
    ) {
        guard let outDir = parityOutputDirectory else {
            XCTFail("PARITY_OUTPUT_DIR is required for parity screenshot \(name)", file: file, line: line)
            return
        }
        let screenshot = window.screenshot()
        let data = screenshot.pngRepresentation
        let fileURL = URL(fileURLWithPath: outDir, isDirectory: true).appendingPathComponent("\(name).png")
        do {
            try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try data.write(to: fileURL)
        } catch {
            XCTFail("Failed to write parity screenshot \(name): \(error)", file: file, line: line)
            return
        }
        attachPNG(data, named: name)
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
