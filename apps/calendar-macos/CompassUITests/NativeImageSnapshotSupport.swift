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

    /// Attaches a full-window screenshot; `record-macos-parity-captures.sh` crops the title bar slice.
    @MainActor
    static func exportMacTitleBarReference(
        _ window: XCUIElement,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard parityCapture else { return }
        guard window.waitForExistence(timeout: 10) else {
            XCTFail("Window missing for title bar reference screenshot", file: file, line: line)
            return
        }
        let sidebarToggle = window.buttons.matching(
            NSPredicate(format: "label IN %@", ["Open sidebar", "Close sidebar"])
        ).firstMatch
        XCTAssertTrue(sidebarToggle.waitForExistence(timeout: 5))
        XCTAssertLessThan(
            sidebarToggle.frame.maxX,
            window.frame.maxX - 2,
            "Sidebar toggle should sit inside the captured window width")
        let toggleMinX = sidebarToggle.frame.minX - window.frame.minX
        let toggleMaxX = sidebarToggle.frame.maxX - window.frame.minX
        let toggleMinY = sidebarToggle.frame.minY - window.frame.minY
        let toggleMaxY = sidebarToggle.frame.maxY - window.frame.minY
        let windowWidth = window.frame.width
        // Web: toggle is on the main column's right edge, left of the open sidebar (~345+32).
        let sidebarChrome: CGFloat = 345 + 32
        let contentTrackRight = windowWidth - sidebarChrome
        XCTAssertGreaterThan(
            toggleMaxX,
            contentTrackRight - 72,
            "Sidebar toggle should sit near the content-track edge (maxX \(toggleMaxX), track ends ~\(contentTrackRight))")
        XCTAssertLessThan(
            toggleMaxX,
            contentTrackRight + 8,
            "Sidebar toggle should not paint over the sidebar panel (maxX \(toggleMaxX), track ends ~\(contentTrackRight))")
        XCTAssertGreaterThan(
            toggleMinX,
            windowWidth * 0.45,
            "Sidebar toggle should stay in the right half of the window (minX \(toggleMinX))")
        let headerTitle = window.buttons["compass-native-header-title"]
        XCTAssertTrue(headerTitle.waitForExistence(timeout: 5))
        XCTAssertTrue(
            headerTitle.label.contains("2026"),
            "Title bar reference should show demo month title, got: \(headerTitle.label)")
        XCTAssertLessThan(
            headerTitle.frame.minY,
            window.frame.maxY - window.frame.height * 0.85,
            "Month title should sit in the top band of the window screenshot")
        if let url = URL(string: "compass://debug/parity-apply-capture-window") {
            NSWorkspace.shared.open(url)
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 1.2))
        }
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.5))
        attachToggleProbeBounds(
            minX: toggleMinX,
            maxX: toggleMaxX,
            minY: toggleMinY,
            maxY: toggleMaxY,
            outDir: parityOutputDirectory
        )
        if let outDir = parityOutputDirectory,
           let windowID = waitForParityWindowId(in: outDir),
           let screencap = screencaptureWindowPNG(windowID: windowID, in: outDir)
        {
            attachPNG(screencap, named: "mac-title-bar-full-window")
            return
        }
        let png = window.screenshot().pngRepresentation
        guard !png.isEmpty else {
            XCTFail("Empty window screenshot for title bar reference", file: file, line: line)
            return
        }
        attachPNG(png, named: "mac-title-bar-full-window")
    }

    private static func attachToggleProbeBounds(
        minX: CGFloat,
        maxX: CGFloat,
        minY: CGFloat,
        maxY: CGFloat,
        outDir: String?
    ) {
        let payload: [String: Double] = [
            "minX": Double(minX),
            "maxX": Double(maxX),
            "minY": Double(minY),
            "maxY": Double(maxY),
        ]
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload)
        else { return }
        if let outDir {
            let dir = URL(fileURLWithPath: outDir, isDirectory: true)
            try? data.write(to: dir.appendingPathComponent("parity-toggle-bounds.json"))
            let metrics = dir.appendingPathComponent("parity-window-metrics.txt")
            let line =
                "toggleMinX=\(minX)\ntoggleMaxX=\(maxX)\ntoggleMinY=\(minY)\ntoggleMaxY=\(maxY)\n"
            let existing = (try? String(contentsOf: metrics, encoding: .utf8)) ?? ""
            try? (existing + line).write(to: metrics, atomically: true, encoding: .utf8)
        }
        let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        attachment.name = "parity-toggle-bounds.json"
        attachment.lifetime = .keepAlways
        XCTContext.runActivity(named: "Sidebar toggle probe bounds") { activity in
            activity.add(attachment)
        }
    }

    private static func waitForParityWindowId(in outDir: String, timeout: TimeInterval = 8) -> String? {
        let path = (outDir as NSString).appendingPathComponent("parity-window-id.txt")
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let raw = try? String(contentsOf: URL(fileURLWithPath: path), encoding: .utf8) {
                let id = raw.trimmingCharacters(in: .whitespacesAndNewlines)
                if !id.isEmpty, id.allSatisfy(\.isNumber) {
                    return id
                }
            }
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))
        }
        return nil
    }

    private static func screencaptureWindowPNG(windowID: String, in outDir: String) -> Data? {
        let dest = (outDir as NSString).appendingPathComponent("_mac_title_bar_screencap.png")
        try? FileManager.default.removeItem(atPath: dest)
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/screencapture")
        process.arguments = ["-l", windowID, "-x", dest]
        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            return nil
        }
        guard process.terminationStatus == 0,
              let data = try? Data(contentsOf: URL(fileURLWithPath: dest)),
              !data.isEmpty
        else { return nil }
        return data
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
