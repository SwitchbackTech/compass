import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public var isEventFormVisible: Bool {
        draftStore.status.isFormOpen && draftStore.gridDraft != nil
    }

    public func didCopyDescriptionLink() {
        recordShortcut(.editCopyDescriptionLink)
        statusToastStore.show(id: "description-link-copied", message: "Link copied")
    }

    public func focusEventFormField(_ field: EventFormField) {
        eventFormFocusedField = field
    }

    public func openKeyboardEditForFocusedEvent() {
        guard viewStore.view != .life,
            draftStore.gridDraft == nil,
            let eventId = focusStore.focusedEventId,
            let event = loadedEvents.first(where: { $0.id == eventId }),
            let draft = GridEventDraftFromEvent.editDraft(from: event)
        else { return }
        draftStore.startGridDraft(activity: .keyboardEdit, draft: draft)
        eventFormFocusedField = .title
        rebuildPresentation()
        focusEvent(eventId: eventId.rawValue)
    }

    public func openEventFormForCurrentDraft() {
        guard draftStore.gridDraft != nil else { return }
        draftStore.setFormOpen(true)
        eventFormFocusedField = .title
        rebuildPresentation()
    }

    public var canChangeDraftCalendar: Bool {
        draftStore.gridDraft?.kind == .create || eventsStore.source == .local
    }

    public func updateDraftFromForm(
        title: String? = nil,
        description: String? = nil,
        location: String? = nil,
        calendarId: CalendarId? = nil,
        color: EventColorSlot?? = nil,
        schedule: DraftSchedule? = nil
    ) {
        guard var draft = draftStore.gridDraft else { return }
        if let title { draft.title = title }
        if let description { draft.description = description }
        if let location { draft.location = location }
        if let calendarId, canChangeDraftCalendar { draft.calendarId = calendarId }
        if let color { draft.color = color }
        if let schedule { draft.schedule = schedule }
        draftStore.setGridDraft(draft)
        rebuildPresentation()
    }

    public func setDraftAllDay(_ allDay: Bool) {
        guard var draft = draftStore.gridDraft else { return }
        let calendar = EffectiveTimeZone.calendar
        if allDay {
            let start = calendar.startOfDay(for: draft.schedule.start)
            let end = calendar.date(byAdding: .day, value: 1, to: start) ?? start
            draft.schedule = DraftSchedule(start: start, end: end, kind: .allDay)
        } else {
            let start = draft.schedule.start
            let end = DraftTiming.timedDraftEnd(start: start)
            draft.schedule = DraftSchedule(start: start, end: end, kind: .timed)
        }
        draftStore.setGridDraft(draft)
        rebuildPresentation()
    }

    public func updateAllDayDraftStart(_ date: Date) {
        guard let draft = draftStore.gridDraft, draft.schedule.kind == .allDay else { return }
        let calendar = EffectiveTimeZone.calendar
        let start = calendar.startOfDay(for: date)
        guard let minimumEnd = calendar.date(byAdding: .day, value: 1, to: start) else { return }
        updateDraftFromForm(schedule: .init(
            start: start, end: max(draft.schedule.end, minimumEnd), kind: .allDay))
    }

    /// The form shows the last included day; stored all-day ends are exclusive.
    public func updateAllDayDraftEnd(_ date: Date) {
        guard let draft = draftStore.gridDraft, draft.schedule.kind == .allDay else { return }
        let calendar = EffectiveTimeZone.calendar
        let lastDay = max(calendar.startOfDay(for: date), draft.schedule.start)
        guard let end = calendar.date(byAdding: .day, value: 1, to: lastDay) else { return }
        updateDraftFromForm(schedule: .init(start: draft.schedule.start, end: end, kind: .allDay))
    }

    public func requestCloseEventForm() {
        guard draftStore.status.isFormOpen else { return }
        if draftStore.hasUnsavedFormChanges || hasMeaningfulDraftTitle() {
            pendingDiscardDraftConfirmation = true
            return
        }
        discardDraftConfirmed()
    }

    public func closeEventFormConfirmed() {
        discardDraftConfirmed()
    }

    public func duplicateFocusedOrFormEvent() async {
        let revision = sessionRevision
        let sourceEvent: Event? = {
            if let draft = draftStore.gridDraft, draft.kind == .edit,
                let id = draft.persistedEventId
            {
                return loadedEvents.first { $0.id == id }
            }
            if let id = focusStore.focusedEventId {
                return loadedEvents.first { $0.id == id }
            }
            return nil
        }()
        guard let event = sourceEvent,
            let duplicate = GridEventDraftFromEvent.duplicateDraft(from: event, calendars: calendars)
        else { return }

        var ready = duplicate
        ready.calendarId = ready.calendarId ?? defaultTargetCalendarId()
        guard let input = GridEventDraftMapping.createInput(from: ready),
            let optimistic = GridEventDraftMapping.optimisticEvent(from: ready)
        else { return }

        draftStore.discard()
        rebuildPresentation()
        let savedId = optimistic.id.rawValue
        do {
            try await eventsStore.createOptimistic(input: input, optimisticEvent: optimistic)
            guard revision == sessionRevision else { return }
            loadedEvents = try eventsStore.fetchAllEvents()
            rebuildPresentation()
            focusEvent(eventId: savedId)
        } catch {}
    }

    public func deleteFormEvent() async {
        await requestDeleteFormEvent()
    }

    public func jumpEventFormField(digit: Character) {
        guard let field = FormFieldDigitMapping.field(
            forDigitCharacter: digit,
            rows: shortcutRegistry.editSequenceFields
        ) else { return }
        focusEventFormField(field)
    }

    public func formFieldDigitTargets() -> [PageJumpTarget] {
        FormFieldDigitMapping.sortedRows(shortcutRegistry.editSequenceFields).compactMap { row in
            guard EventFormField(rawValue: row.field) != nil else { return nil }
            let anchorId = row.field == "actions" ? "form-actions" : "form-\(row.field)"
            return PageJumpTarget(id: anchorId, digit: row.digit, label: row.label)
        }
    }

    private func hasMeaningfulDraftTitle() -> Bool {
        guard let draft = draftStore.gridDraft else { return false }
        return !draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public func baselineEvent(for draft: GridEventDraft) -> Event? {
        guard draft.kind == .edit, let id = draft.persistedEventId else { return nil }
        return loadedEvents.first { $0.id == id }
    }
}
