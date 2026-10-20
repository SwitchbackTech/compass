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
            pixelsHigh: pixelHeight,
            bitsPerSample: 8,
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

    private static func enableLayerBackedDrawing(_ view: NSView) {
        view.wantsLayer = true
        for subview in view.subviews {
            enableLayerBackedDrawing(subview)
        }
    }

    /// SwiftUI hosting views sometimes produce empty `cacheDisplay` bitmaps; fall back to the
    /// composited window image (same pixels the user sees on screen).
    @MainActor
    static func exportTitleBarReference(from window: NSWindow?) throws {
        guard UITestLaunchPolicy.isParityCapture else { return }
        guard let window, let directory = parityOutputDirectory else { return }

        ParityCaptureWindowPolicy.applyIfNeeded(to: window)
        window.orderFrontRegardless()
        window.makeKeyAndOrderFront(nil)
        window.contentView?.layoutSubtreeIfNeeded()
        window.displayIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.25))

        let captureHeight = MacTitleBarChromeMetrics.referenceCaptureHeight
        guard let png = compositeTitleBarPNG(window: window, captureHeightPoints: captureHeight) else { return }

        let folder = URL(fileURLWithPath: directory, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let file = folder.appendingPathComponent("mac-title-bar.png")
        try png.write(to: file)
        NativeAccessibilityProbes.publishParityExport(surface: "mac-title-bar", on: window)
    }

    /// Canonical 1280px-wide title band: content snapshot (nav + toggle) with system traffic lights composited on the left.
    @MainActor
    private static func compositeTitleBarPNG(window: NSWindow, captureHeightPoints: CGFloat) -> Data? {
        guard let contentBand = contentTitleBarPNG(window: window, captureHeightPoints: captureHeightPoints),
              let contentRep = NSBitmapImageRep(data: contentBand),
              let contentImage = contentRep.cgImage
        else { return nil }

        let width = contentImage.width
        let height = contentImage.height
        guard width >= Int(ParityCaptureGeometry.viewportWidth) - 40 else { return nil }

        guard let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return nil }

        context.draw(contentImage, in: CGRect(x: 0, y: 0, width: width, height: height))

        if let chrome = windowTitleBarChromePNG(window: window, captureHeightPoints: captureHeightPoints),
           let chromeRep = NSBitmapImageRep(data: chrome),
           let chromeImage = chromeRep.cgImage
        {
            let inset = Int(MacTitleBarChromeMetrics.trafficLightLeadingInset.rounded())
            let overlayWidth = min(inset + 24, chromeImage.width, width)
            let dest = CGRect(x: 0, y: 0, width: overlayWidth, height: height)
            let source = CGRect(x: 0, y: 0, width: overlayWidth, height: min(height, chromeImage.height))
            if let slice = chromeImage.cropping(to: source) {
                context.draw(slice, in: dest)
            }
        }

        guard let output = context.makeImage() else { return nil }
        let rep = NSBitmapImageRep(cgImage: output)
        rep.size = NSSize(width: ParityCaptureGeometry.viewportWidth, height: captureHeightPoints)
        guard let png = rep.representation(using: .png, properties: [:]),
              titleBarPNGHasChrome(png)
        else { return nil }
        return png
    }

    @MainActor
    private static func contentTitleBarPNG(window: NSWindow, captureHeightPoints: CGFloat) -> Data? {
        guard let contentView = window.contentView else { return nil }
        ParityCaptureWindowPolicy.applyIfNeeded(to: window)
        window.displayIfNeeded()
        contentView.layoutSubtreeIfNeeded()
        enableLayerBackedDrawing(contentView)
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))

        guard let bitmap = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: pixelWidth,
            pixelsHigh: pixelHeight,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        ) else { return nil }

        bitmap.size = NSSize(
            width: ParityCaptureGeometry.viewportWidth,
            height: ParityCaptureGeometry.viewportHeight
        )
        NSGraphicsContext.saveGraphicsState()
        defer { NSGraphicsContext.restoreGraphicsState() }
        guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else { return nil }
        NSGraphicsContext.current = context
        let captureRect = NSRect(
            origin: .zero,
            size: NSSize(
                width: ParityCaptureGeometry.viewportWidth,
                height: ParityCaptureGeometry.viewportHeight
            )
        )
        context.cgContext.clear(CGRect(x: 0, y: 0, width: pixelWidth, height: pixelHeight))
        contentView.cacheDisplay(in: captureRect, to: bitmap)

        guard let fullImage = bitmap.cgImage else { return nil }
        let bandPixels = min(
            fullImage.height,
            max(1, Int((captureHeightPoints / ParityCaptureGeometry.viewportHeight * CGFloat(pixelHeight)).rounded(.up)))
        )
        let cropRect = CGRect(
            x: 0,
            y: fullImage.height - bandPixels,
            width: fullImage.width,
            height: bandPixels
        )
        guard let band = fullImage.cropping(to: cropRect) else { return nil }
        let rep = NSBitmapImageRep(cgImage: band)
        rep.size = NSSize(width: ParityCaptureGeometry.viewportWidth, height: captureHeightPoints)
        return rep.representation(using: .png, properties: [:])
    }

    /// Top slice of the on-screen window frame (system traffic lights).
    @MainActor
    private static func windowTitleBarChromePNG(window: NSWindow, captureHeightPoints: CGFloat) -> Data? {
        captureTitleBarPNG(window: window, captureHeightPoints: captureHeightPoints)
    }

    @MainActor
    private static func captureTitleBarPNG(window: NSWindow, captureHeightPoints: CGFloat) -> Data? {
        let windowID = CGWindowID(window.windowNumber)
        guard windowID != 0 else { return nil }

        let frame = window.frame
        for delay in [0.0, 0.15, 0.35] {
            if delay > 0 {
                RunLoop.current.run(until: Date(timeIntervalSinceNow: delay))
            }
            window.displayIfNeeded()
            guard let cgImage = CGWindowListCreateImage(
                frame,
                .optionIncludingWindow,
                windowID,
                [.bestResolution]
            ) else { continue }

            guard let cropped = cropTopBand(from: cgImage, frameHeight: frame.height, bandPoints: captureHeightPoints)
            else { continue }

            let rep = NSBitmapImageRep(cgImage: cropped)
            rep.size = NSSize(width: frame.width, height: captureHeightPoints)
            return rep.representation(using: .png, properties: [:])
        }
        return nil
    }

    private static func cropTopBand(
        from image: CGImage,
        frameHeight: CGFloat,
        bandPoints: CGFloat
    ) -> CGImage? {
        let scale = CGFloat(image.height) / max(frameHeight, 1)
        let cropPixels = min(
            image.height,
            max(1, Int((bandPoints * scale).rounded(.up)))
        )
        let cropRect = CGRect(
            x: 0,
            y: image.height - cropPixels,
            width: image.width,
            height: cropPixels
        )
        return image.cropping(to: cropRect)
    }

    /// Reject empty captures and shadow-only strips (parity CI has no human eyeball).
    private static func titleBarPNGHasChrome(_ png: Data) -> Bool {
        guard let rep = NSBitmapImageRep(data: png), rep.pixelsWide >= 400, rep.pixelsHigh >= 80 else {
            return false
        }
        guard let cg = rep.cgImage else { return false }
        let sampleRows = min(8, cg.height / 16)
        var opaquePixels = 0
        var variedPixels = 0
        var darkPixels = 0
        let width = cg.width
        let height = cg.height
        guard let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return false }
        context.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
        guard let data = context.data else { return false }
        let bytes = data.bindMemory(to: UInt8.self, capacity: width * height * 4)
        for row in 0 ..< sampleRows {
            let y = height - 1 - (row * max(1, height / sampleRows))
            for x in stride(from: 0, to: width, by: max(1, width / 40)) {
                let offset = (y * width + x) * 4
                let r = bytes[offset]
                let g = bytes[offset + 1]
                let b = bytes[offset + 2]
                let a = bytes[offset + 3]
                if a < 16 { continue }
                opaquePixels += 1
                if max(r, g, b) - min(r, g, b) > 24 || max(r, g, b) < 240 {
                    variedPixels += 1
                }
                if Int(r) + Int(g) + Int(b) < 520 {
                    darkPixels += 1
                }
            }
        }
        var rightDark = 0
        let rightStart = max(0, width - Int(Double(width) * 0.12))
        for y in 0 ..< min(height, Int(Double(height) * 0.55)) {
            for x in rightStart ..< width {
                let offset = (y * width + x) * 4
                let r = bytes[offset]
                let g = bytes[offset + 1]
                let b = bytes[offset + 2]
                let a = bytes[offset + 3]
                if a < 16 { continue }
                if Int(r) + Int(g) + Int(b) < 520 { rightDark += 1 }
            }
        }
        return opaquePixels > 40
            && (variedPixels > 8 || darkPixels > 6)
            && rightDark > 4
            && width >= 1240
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
