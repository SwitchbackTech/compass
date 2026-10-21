import AppKit
import CompassKit
import Foundation

extension NativeCalendarRootModel {
    public func meetingLinkURL(for draft: GridEventDraft?) -> String? {
        guard let draft else { return nil }
        return EventFormMeetingLink.url(
            isEditDraft: draft.kind == .edit,
            baseline: baselineEvent(for: draft))
    }

    public var formHasMeetingLink: Bool {
        meetingLinkURL(for: draftStore.gridDraft) != nil
    }

    @discardableResult
    public func copyMeetingLinkFromForm() -> Bool {
        guard let draft = draftStore.gridDraft,
            let url = meetingLinkURL(for: draft)
        else { return false }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(url, forType: .string)
        recordShortcut(.editCopyMeetingLink)
        statusToastStore.show(id: EventFormMeetingLink.copiedToastId, message: "Link copied")
        return true
    }

    public func didCopyMeetingLinkFromControl() {
        copyMeetingLinkFromForm()
    }

    public func eventFormActionsPaletteOptions(for draft: GridEventDraft) -> EventFormActions.Options {
        EventFormActions.Options(
            hasMeetingLink: meetingLinkURL(for: draft) != nil,
            isExistingEvent: draft.kind == .edit,
            isReadOnly: isEventFormReadOnly(for: draft),
            showBookingFormActions: hasBookedMeetingActions)
    }
}
