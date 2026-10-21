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

    public func activateEventJumpMode() {
        guard !eventJumpSelection.modeActive else { return }
        eventJumpSelection.setModeActive(true)
        recordShortcut(.focusShiftHold)
        refreshEventJumpPresentation()
    }

    public func toggleEventJumpMode() {
        if eventJumpSelection.modeActive {
            clearEventJumpSelection()
            draftStore.setQuickTimeDigits("")
            return
        }
        activateEventJumpMode()
    }

    @discardableResult
    public func handleEventJumpKeystroke(_ key: Character) -> Bool {
        guard eventJumpSelection.modeActive else { return false }
        let dayKeyByPrefix = dayKeyByPrefixForJump()
        guard
            let match = DayJumpKeyAssignment.matchKeystroke(
                assignments: eventJumpAssignments,
                dayKeyByPrefix: dayKeyByPrefix,
                key: key,
                buffer: eventJumpSelection.dayJumpBuffer
            )
        else { return false }
        applyEventJumpMatch(match)
        return true
    }

    private func dayKeyByPrefixForJump() -> [String: String] {
        let calendar = EffectiveTimeZone.calendar
        var map: [String: String] = [:]
        for dayKey in visibleDateKeys() {
            guard let date = CompassDateParsing.calendarDateInEffectiveTimeZone(dayKey) else { continue }
            let weekday = calendar.component(.weekday, from: date) - 1
            let prefix = DayJumpPrefixes.prefix(forWeekday: weekday)
            map[prefix] = dayKey
        }
        return map
    }

    private func applyEventJumpMatch(_ match: DayJumpKeyAssignment.MatchResult) {
        eventJumpAmbiguousTask?.cancel()
        eventJumpAmbiguousTask = nil

        switch match {
        case let .selectDay(dayPrefix, dayKey, firstEventId, buffer):
            let name = DayJumpPrefixes.displayName(forPrefix: dayPrefix)
            eventJumpSelection.selectDay(
                key: dayKey,
                announcement: "\(name) selected",
                buffer: buffer
            )
            recordShortcut(.focusWeekDay)
            if let firstEventId {
                focusEvent(eventId: firstEventId)
            }
            refreshEventJumpPresentation()

        case let .prefix(buffer, dayKeys, pendingExactEventId):
            if buffer == "s", dayKeys.isEmpty {
                eventJumpSelection.setWeekendDisambiguation(announcement: "Weekend")
            } else {
                eventJumpSelection.setPrefixBuffer(buffer, dayKeys: dayKeys, announcement: nil)
            }
            if let pendingExactEventId {
                scheduleAmbiguousEventJumpCommit(eventId: pendingExactEventId, buffer: buffer)
            }
            refreshEventJumpPresentation()

        case let .focus(eventId, _, buffer):
            eventJumpSelection.setPrefixBuffer(buffer, dayKeys: eventJumpSelection.activeDayKeys, announcement: nil)
            focusEvent(eventId: eventId)
            refreshEventJumpPresentation()
        }
    }

    private func scheduleAmbiguousEventJumpCommit(eventId: String, buffer: String) {
        eventJumpAmbiguousTask?.cancel()
        eventJumpAmbiguousTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                guard let self, self.eventJumpSelection.dayJumpBuffer == buffer else { return }
                self.focusEvent(eventId: eventId)
                self.refreshEventJumpPresentation()
            }
        }
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
            if let first = loadedEvents.first(where: { event in
                eventJumpDayKey(for: event) == dayKey
            }) {
                focusEvent(eventId: first.id.rawValue)
            }
            refreshEventJumpPresentation()
            return
        }
    }

    public func clearEventJumpSelection() {
        eventJumpAmbiguousTask?.cancel()
        eventJumpAmbiguousTask = nil
        eventJumpSelection.clear()
        eventJumpAssignments = []
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

    private func eventJumpDayKey(for event: Event) -> String {
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
