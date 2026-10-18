import CompassKit
import Foundation

struct BookingEventActionContext: Equatable, Sendable {
    let eventId: EventId
    let links: BookingEventLinks
    let guestName: String
}

extension NativeCalendarRootModel {
    public var hasBookedMeetingActions: Bool { bookingEventActionContext != nil }
    public var isConfirmingBookingCancellation: Bool {
        pendingBookingCancellation != nil && pendingBookingCancellation == bookingEventActionContext
    }

    @discardableResult
    public func cancelBookedMeetingConfirmation() -> Bool {
        guard pendingBookingCancellation != nil else { return false }
        pendingBookingCancellation = nil
        return true
    }

    public func triggerBookedMeetingCancellation() async {
        guard !isCancellingBookedMeeting, let context = bookingEventActionContext else { return }
        recordShortcut(.editCancelMeeting)
        guard pendingBookingCancellation == context else {
            pendingBookingCancellation = context
            return
        }
        pendingBookingCancellation = nil
        let revision = sessionRevision
        let submittedDraft = draftStore.gridDraft
        isCancellingBookedMeeting = true
        defer { if revision == sessionRevision { isCancellingBookedMeeting = false } }
        let message: String
        do {
            try await BookingAPI(client: environment.apiClient).cancelReservation(
                id: context.links.reservationId, input: .init(token: context.links.token))
            message = "Meeting cancelled. \(context.guestName) was emailed."
        } catch CompassAPIError.httpStatus(let status, _) where status == 404 || status == 409 {
            message = "This meeting was already cancelled."
        } catch {
            guard revision == sessionRevision else { return }
            statusToastStore.show(id: "booking-cancel-meeting", message: "Could not cancel meeting. Try again.")
            return
        }
        guard revision == sessionRevision else { return }
        if draftStore.gridDraft == submittedDraft {
            draftStore.discard()
            rebuildPresentation()
        }
        statusToastStore.show(id: "booking-cancel-meeting", message: message)
        try? eventsStore.invalidateRanges()
        await refreshVisibleRange()
    }

    public func rescheduleBookedMeeting() {
        guard !isCancellingBookedMeeting, let context = bookingEventActionContext,
              let url = URL(string: context.links.rescheduleURL), let openExternalURLHandler else { return }
        pendingBookingCancellation = nil
        recordShortcut(.editRescheduleMeeting)
        openExternalURLHandler(url)
    }

    private var bookingEventActionContext: BookingEventActionContext? {
        guard let draft = draftStore.gridDraft, draft.kind == .edit,
              let event = baselineEvent(for: draft), !EventInteractionPolicy.isReadOnly(event: event, calendars: calendars),
              case .details(let details) = event.content, let links = BookingEventLinks.parse(details.description),
              isAppBookingURL(links.cancelURL), isAppBookingURL(links.rescheduleURL) else { return nil }
        let guest = details.attendees?.first
        let name = guest?.displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return BookingEventActionContext(eventId: event.id, links: links,
            guestName: name.isEmpty ? (guest?.email ?? "Guest") : name)
    }

    private func isAppBookingURL(_ value: String) -> Bool {
        guard let url = URL(string: value), let scheme = url.scheme?.lowercased(),
              scheme == "https" || scheme == "http", url.user == nil, url.password == nil else { return false }
        let origin = environment.apiClient.baseURL
        let defaultPort = scheme == "https" ? 443 : 80
        return scheme == origin.scheme?.lowercased() && url.host?.lowercased() == origin.host?.lowercased()
            && (url.port ?? defaultPort) == (origin.port ?? defaultPort)
    }
}
