import AppKit
import CompassData
import CompassKit
import CoreGraphics

/// Renders the main window content at the canonical parity viewport (1280×820 px).
enum ParityViewSnapshotExporter {
    private static let pixelWidth = Int(ParityCaptureGeometry.viewportWidth)
    private static let pixelHeight = Int(ParityCaptureGeometry.viewportHeight)

    @MainActor
    static func export(surface: String, from window: NSWindow?) throws {
        guard UITestLaunchPolicy.isParityCapture else { return }
        guard ParityCaptureSurface.isValid(surface) else { return }
        guard let window, let contentView = window.contentView else { return }
        guard let directory = parityOutputDirectory else { return }

        ParityCaptureWindowPolicy.applyIfNeeded(to: window)
        window.displayIfNeeded()
        contentView.layoutSubtreeIfNeeded()
        contentView.wantsLayer = true
        contentView.layer?.displayIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))

        let contentSize = NSSize(
            width: ParityCaptureGeometry.viewportWidth,
            height: ParityCaptureGeometry.viewportHeight
        )
        let laidOut = window.contentRect(forFrameRect: window.frame)
        if abs(laidOut.width - contentSize.width) > 2 || abs(laidOut.height - contentSize.height) > 2 {
            ParityCaptureWindowPolicy.applyIfNeeded(to: window)
            window.displayIfNeeded()
        }

        guard let bitmap = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: pixelWidth,
            bitsPerSample: 8,
            pixelsHigh: pixelHeight,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        ) else { return }

        bitmap.size = contentSize
        NSGraphicsContext.saveGraphicsState()
        defer { NSGraphicsContext.restoreGraphicsState() }
        guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else { return }
        NSGraphicsContext.current = context
        let captureRect = NSRect(origin: .zero, size: contentSize)
        context.cgContext.clear(CGRect(x: 0, y: 0, width: pixelWidth, height: pixelHeight))
        enableLayerBackedDrawing(contentView)
        contentView.cacheDisplay(in: captureRect, to: bitmap)

        let folder = URL(fileURLWithPath: directory, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let file = folder.appendingPathComponent("\(surface).png")

        let pngData = bitmap.representation(using: .png, properties: [:])
        if let pngData, pngData.count < 30_000, let windowPNG = windowListPNG(window: window) {
            try windowPNG.write(to: file)
            NativeAccessibilityProbes.publishParityExport(surface: surface, on: window)
            return
        }

        guard let png = pngData else { return }
        try png.write(to: file)
        NativeAccessibilityProbes.publishParityExport(surface: surface, on: window)
    }

    /// Ensures the on-screen window matches parity dimensions before XCUITest screenshots.
    @MainActor
    static func applyCaptureWindowSize(to window: NSWindow?) {
        guard UITestLaunchPolicy.isParityCapture else { return }
        ParityCaptureWindowPolicy.applyIfNeeded(to: window)
        window?.orderFrontRegardless()
        window?.makeKeyAndOrderFront(nil)
        window?.displayIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.2))
    }

    private static func enableLayerBackedDrawing(_ view: NSView) {
        view.wantsLayer = true
        for subview in view.subviews {
            enableLayerBackedDrawing(subview)
        }
    }

    private static func windowListPNG(window: NSWindow) -> Data? {
        window.orderFrontRegardless()
        window.displayIfNeeded()
        let windowID = CGWindowID(window.windowNumber)
        guard windowID != 0,
              let cgImage = CGWindowListCreateImage(
                  .null,
                  .optionIncludingWindow,
                  windowID,
                  [.boundsIgnoreFraming, .bestResolution]
              )
        else { return nil }
        let rep = NSBitmapImageRep(cgImage: cgImage)
        rep.size = NSSize(
            width: ParityCaptureGeometry.viewportWidth,
            height: ParityCaptureGeometry.viewportHeight
        )
        return rep.representation(using: .png, properties: [:])
    }

    private static var parityOutputDirectory: String? {
        if let dir = ProcessInfo.processInfo.environment["PARITY_OUTPUT_DIR"], !dir.isEmpty {
            return dir
        }
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-PARITY_OUTPUT_DIR"), index + 1 < args.count {
            return args[index + 1]
        }
        return nil
    }
}
