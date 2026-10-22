import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public var eventJumpSelection: EventJumpSelectionStore { overlayStores.eventJumpSelection }

    public var eventJumpStatusText: String? {
        guard eventJumpSelection.isActive else { return nil }
        if eventJumpSelection.modeActive,
            eventJumpSelection.activeDayKeys.isEmpty,
            eventJumpSelection.dayJumpBuffer.isEmpty,
            eventJumpSelection.announcement == nil
        {
            return "Event jump on · Esc"
        }
        if eventJumpSelection.dayJumpBuffer == "s", eventJumpSelection.activeDayKeys.isEmpty {
            return "Shift+U Sunday · Shift+A Saturday · Esc"
        }
        if let announcement = eventJumpSelection.announcement {
            if eventJumpSelection.activeDayKeys.isEmpty {
                return "Event jump · \(announcement) · Esc"
            }
            return "Jump · \(announcement) · C timed · Shift+C all-day · Esc"
        }
        return "Event jump · Esc"
    }

    public func toggleEventJumpMode() {
        if eventJumpSelection.modeActive {
            clearEventJumpSelection()
            draftStore.setQuickTimeDigits("")
            return
        }
        eventJumpSelection.setModeActive(true)
        recordShortcut(.focusShiftHold)
        refreshEventJumpPresentation()
    }

    func refreshEventJumpPresentation() {
        if eventJumpSelection.modeActive {
            eventJumpHintLabels = buildEventJumpHints()
            quickTimeSlotHintLabels = buildQuickTimeSlotHints()
        } else {
            eventJumpHintLabels = []
            quickTimeSlotHintLabels = []
        }
        applyFocusPresentation()
    }

    public func handleShiftDayJump(letter: Character) {
        guard viewStore.view == .week || viewStore.view == .day else { return }
        if !eventJumpSelection.modeActive {
            eventJumpSelection.setModeActive(true)
        }
        let lower = String(letter).lowercased()

        if eventJumpSelection.dayJumpBuffer == "s" {
            if lower == "u" {
                selectJumpDay(prefix: "su")
                return
            }
            if lower == "a" {
                selectJumpDay(prefix: "sa")
                return
            }
        }

        if lower == "s" {
            eventJumpSelection.setWeekendDisambiguation(announcement: "Weekend")
            recordShortcut(.focusWeekDay)
            refreshEventJumpPresentation()
            return
        }

        guard let prefix = DayJumpPrefixes.dayPrefix(forShiftedLetter: letter) else { return }
        selectJumpDay(prefix: prefix)
    }

    /// Web jump mode takes day letters bare (W, then 2). F still toggles the
    /// mode off and E / C keep their edit and create shortcuts, so those fall
    /// through (false); every other letter is swallowed so J/K cannot fire.
    public func handleEventJumpLetter(_ letter: Character) -> Bool {
        switch letter.lowercased() {
        case "f", "e", "c":
            return false
        case "m", "t", "w", "r", "s", "u", "a":
            handleShiftDayJump(letter: letter)
            return true
        default:
            return true
        }
    }

    private func selectJumpDay(prefix: String) {
        let calendar = EffectiveTimeZone.calendar
        for dayKey in visibleDateKeys() {
            guard let date = CompassDateParsing.calendarDateInEffectiveTimeZone(dayKey) else { continue }
            let weekday = calendar.component(.weekday, from: date) - 1
            guard DayJumpPrefixes.prefix(forWeekday: weekday) == prefix else { continue }
            let name = DayJumpPrefixes.displayName(forPrefix: prefix)
            eventJumpSelection.selectDay(
                key: dayKey,
                announcement: "\(name) selected",
                buffer: prefix
            )
            recordShortcut(.focusWeekDay)
            // Assignments run in day order then index, so this is the day's 1.
            if let first = dayJumpAssignments().first(where: { $0.dayKey == dayKey }) {
                focusEvent(eventId: first.eventId)
            }
            refreshEventJumpPresentation()
            return
        }
    }

    /// Web `matchDayJumpKeystroke` digits: once a day is typed, digits pick
    /// that day's events (W1, W12). Before that they belong to quick-time, so
    /// this returns false.
    public func handleEventJumpDigit(_ digit: Character) -> Bool {
        let buffer = eventJumpSelection.dayJumpBuffer
        guard !buffer.isEmpty, buffer != "s" else { return false }
        eventJumpCommitTask?.cancel()
        switch DayJumpKeys.matchDigit(dayJumpAssignments(), next: buffer + String(digit)) {
        case .focus(let eventId, _):
            commitEventJump(eventId: eventId)
        case .prefix(let next, let exactEventId):
            eventJumpSelection.setDayJumpBuffer(next)
            refreshEventJumpPresentation()
            if let exactEventId {
                eventJumpCommitTask = Task { @MainActor [weak self] in
                    try? await Task.sleep(for: DayJumpKeys.ambiguousCommitDelay)
                    guard !Task.isCancelled, let self, self.eventJumpSelection.dayJumpBuffer == next else { return }
                    self.commitEventJump(eventId: exactEventId)
                }
            }
        case .none:
            break
        }
        return true
    }

    /// Web `commitFocus`: keep the day selected so the next digit picks again.
    private func commitEventJump(eventId: String) {
        let buffer = eventJumpSelection.dayJumpBuffer
        eventJumpSelection.setDayJumpBuffer(String(buffer.prefix { !$0.isNumber }))
        focusEvent(eventId: eventId)
        refreshEventJumpPresentation()
    }

    public func clearEventJumpSelection() {
        eventJumpCommitTask?.cancel()
        eventJumpSelection.clear()
        eventJumpHintLabels = []
        quickTimeSlotHintLabels = []
        applyFocusPresentation()
    }

    func buildQuickTimeSlotHints() -> [QuickTimeSlotHint] {
        guard eventJumpSelection.modeActive else { return [] }
        let focusedDay = QuickTime.quickTimeFocusedColumnDay(
            activeDayKeys: eventJumpSelection.activeDayKeys)
        let targetDay = QuickTime.quickTimeTargetDay(
            startOfView: startOfView,
            endOfView: endOfView,
            now: referenceNow,
            focusedDay: focusedDay
        )
        let timedStarts: [Date] = loadedEvents.compactMap { event in
            guard case .timed(let timed) = event.schedule else { return nil }
            return CompassDateParsing.parseInEffectiveTimeZone(timed.start.rawValue)
        }
        let timedEnds: [Date] = loadedEvents.compactMap { event in
            guard case .timed(let timed) = event.schedule else { return nil }
            return CompassDateParsing.parseInEffectiveTimeZone(timed.end.rawValue)
        }
        let busy = QuickTime.timedEventsToBusyIntervals(startDates: timedStarts, endDates: timedEnds)
        let slots = QuickTime.buildQuickTimeSlots(busy: busy, targetDay: targetDay)
        let visibleDates = GridVisibleDate.fromKeys(timeGridState.scenario.visibleDateKeys)
        let colWidths = timeGridState.resolvedColumnWidths()
        let snapshotMetrics = timeGridState.snapshot(colWidths: colWidths).metrics
        let gridMetrics = GridMetrics(
            colWidths: snapshotMetrics.colWidths,
            hourHeight: snapshotMetrics.hourHeight
        )
        let columnIndex: Int? = {
            let key = CompassDateParsing.formatCalendarDay(targetDay)
            return visibleDates.firstIndex(where: { $0.key == key })
        }()
        return slots.compactMap { slot in
            let frame = EventPositionCalculator.getBusyPeriodPosition(
                segmentStart: slot.start,
                segmentEnd: slot.end,
                measurements: gridMetrics,
                visibleDates: visibleDates,
                columnIndex: columnIndex,
                hasSecondaryTimeZone: timeGridState.hasSecondaryTimeZone
            )
            guard frame.width > 0, frame.height > 0 else { return nil }
            return QuickTimeSlotHint(sequence: slot.sequence, frame: frame)
        }
    }

    func eventJumpDayKey(for event: Event) -> String {
        switch event.schedule {
        case .timed(let timed):
            let start = CompassDateParsing.parseInEffectiveTimeZone(timed.start.rawValue) ?? referenceNow
            return CompassDateParsing.formatCalendarDay(start)
        case .allDay(let allDay):
            let start = CompassDateParsing.calendarDateInEffectiveTimeZone(allDay.start) ?? referenceNow
            return CompassDateParsing.formatCalendarDay(start)
        }
    }

}
