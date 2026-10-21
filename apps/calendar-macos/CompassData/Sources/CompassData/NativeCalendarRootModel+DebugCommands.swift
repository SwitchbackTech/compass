import CompassKit
import Foundation

extension NativeCalendarRootModel {
    /// Runs a `compass://debug/...` command through the same paths the keyboard
    /// uses, so shell-driven checks exercise real behavior. The app target only
    /// calls this from Debug builds.
    public func runDebugCommand(_ command: DesktopDebugCommand) async {
        switch command {
        case .create(let title, let start, let minutes):
            createDebugEvent(title: title, start: start, minutes: minutes)
            await saveDraft()
        case .delete(let eventId):
            guard let event = try? eventsStore.fetchAllEvents().first(where: { $0.id.rawValue == eventId })
            else { return }
            await deleteEvent(event, scope: .this)
        case .undo:
            await undoLastChangeAndWait()
        case .redo:
            redoLastChange()
        case .today:
            handleShortcut(.navToday)
        case .goTo(let date):
            if let day = CompassDateParsing.parseInEffectiveTimeZone(date) {
                goToDate(day)
            }
        case .view(.day):
            handleShortcut(.navDayView)
        case .view(.week):
            handleShortcut(.navWeekView)
        case .view(.life):
            handleShortcut(.navLifeView)
        case .parityExport, .parityApplyCaptureWindow, .parityExportTitleBarReference:
            break
        }
    }

    private func createDebugEvent(title: String, start: String?, minutes: Int) {
        guard let start, let startDate = CompassDateParsing.parseInEffectiveTimeZone(start + ":00") else {
            createTimedDraft(activity: .keyboardPlace)
            setDraftTitle(title)
            return
        }
        let end = startDate.addingTimeInterval(TimeInterval(minutes * 60))
        let draft = GridEventDraft(
            clientId: GridEventDraftFactory.makeClientEventId(),
            schedule: DraftSchedule(start: startDate, end: end, kind: .timed),
            calendarId: defaultTargetCalendarId()
        )
        draftStore.startGridDraft(activity: .keyboardPlace, draft: draft)
        setDraftTitle(title)
    }
}
