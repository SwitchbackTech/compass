import AppKit
import CompassKit

@MainActor
final class NativeKeyboardMonitor {
    private let router: NativeGridKeyboardRouter
    private weak var rootView: NSView?

    init(router: NativeGridKeyboardRouter, rootView: NSView) {
        self.router = router
        self.rootView = rootView
    }

    private func owns(_ event: NSEvent) -> Bool {
        guard let window = rootView?.window else { return false }
        return (event.window ?? NSApp.keyWindow) === window && window.attachedSheet == nil
    }

    func start() {
        router.dispatcher.pushScope(.grid)
    }

    func stop() {
        router.dispatcher.popScope(.grid)
    }

    func handleKeyDown(_ event: NSEvent) -> Bool {
        guard owns(event) else { return false }
        return router.handleKeyDown(event)
    }

    func handleFlagsChanged(_ event: NSEvent) {
        guard owns(event) else { return }
        router.handleFlagsChanged(event)
    }

    func handleKeyUp(_ event: NSEvent) {
        guard owns(event) else { return }
        router.handleKeyUp(event)
    }
}
