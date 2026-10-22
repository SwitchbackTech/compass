import CompassKit
import Foundation

extension NativeCalendarRootModel {
    func setPointerDraftIntent(dateKey: String, startISO: String?, timeKey: String?) {
        pointerDraftDateKey = dateKey
        pointerDraftStartISO = startISO
        pointerDraftTimeKey = timeKey
    }

    func clearPointerDraftIntent() {
        pointerDraftDateKey = nil
        pointerDraftStartISO = nil
        pointerDraftTimeKey = nil
    }

    /// Intentional product behavior: empty grid clicks teach keyboard create (Tyler).
    /// Do not remove or suppress this hint in analytics cleanup.
    public func handleGridPointerClick(
        target: GridPointerClickTarget,
        registry: ShortcutRegistry
    ) {
        guard !UITestLaunchPolicy.isParityCapture,
              OnboardingGating.selectPointerHintSurfaceEligible(
                  pointerHintVisible: true,
                  dismissedPermanently: OnboardingGating.pointerHintDismissedPermanently())
        else { return }

        switch target {
        case .allDaySlot(let dateKey):
            setPointerDraftIntent(dateKey: dateKey, startISO: nil, timeKey: nil)
            showPointerHint(for: .allDaySlot, registry: registry)
        case .timedSlot(let dateKey, let timeKey, let timeLabel, let startISO):
            setPointerDraftIntent(dateKey: dateKey, startISO: startISO, timeKey: timeKey)
            showPointerHint(
                for: .timedSlot,
                registry: registry,
                slotClick: GridPointerSlotClickContext(timeKey: timeKey, timeLabel: timeLabel)
            )
        }
    }
}
