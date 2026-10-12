import AppKit
import CompassKit
import EventKit
import Foundation

enum SystemCalendarMapper {
    static let calendarIdPrefix = "eventkit:"

    static func calendarId(for ekCalendar: EKCalendar) -> CalendarId {
        CalendarId(rawValue: "\(calendarIdPrefix)\(ekCalendar.calendarIdentifier)")
    }

    static func eventId(for ekEvent: EKEvent) -> EventId {
        let stable = ekEvent.eventIdentifier ?? UUID().uuidString
        return EventId(rawValue: "\(calendarIdPrefix)event:\(stable)")
    }

    static func compassCalendar(from ekCalendar: EKCalendar) -> CompassCalendar {
        let color = ekCalendar.cgColor?.hexRGB ?? "#6366f1"
        let writable = ekCalendar.allowsContentModifications
        return CompassCalendar(
            access: writable ? .owner : .reader,
            accountEmail: nil,
            backgroundColor: color,
            capabilities: CompassCalendarCapabilities(
                canInviteAttendees: writable,
                canManage: writable,
                canReadAvailability: true,
                canReadDetails: true,
                canWatchEvents: false,
                canWrite: writable,
                conferenceKinds: []),
            conference: nil,
            createsGoogleMeet: nil,
            description: "",
            foregroundColor: "#ffffff",
            id: calendarId(for: ekCalendar).rawValue,
            isActive: true,
            isPrimary: false,
            isVisible: true,
            name: ekCalendar.title,
            provider: "apple",
            timeZone: ekCalendar.timeZone?.identifier ?? EffectiveTimeZone.identifier)
    }

    static func event(from ekEvent: EKEvent, calendarId: CalendarId, now: Date) -> Event? {
        guard let start = ekEvent.startDate, let end = ekEvent.endDate else { return nil }
        let formatter = isoFormatter()
        let createdAt = formatter.string(from: ekEvent.creationDate ?? now)
        let title = ekEvent.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let schedule: EventSchedule
        if ekEvent.isAllDay {
            schedule = .allDay(
                EventSchedule_AllDayPayload(
                    kind: "allDay",
                    startDate: allDayDateString(from: start),
                    endDate: allDayDateString(from: end)))
        } else {
            schedule = .timed(
                EventSchedule_TimedPayload(
                    kind: "timed",
                    start: formatter.string(from: start),
                    end: formatter.string(from: end),
                    timeZone: ekEvent.timeZone?.identifier ?? EffectiveTimeZone.identifier))
        }
        let content: EventContent
        if title.isEmpty {
            content = .busy(EventContent_BusyPayload(kind: "busy"))
        } else {
            content = .details(
                EventContent_DetailsPayload(
                    description: ekEvent.notes ?? "",
                    kind: "details",
                    location: ekEvent.location,
                    title: title))
        }
        return Event(
            calendarId: calendarId,
            content: content,
            createdAt: createdAt,
            icalUid: ekEvent.calendarItemExternalIdentifier,
            id: eventId(for: ekEvent),
            popupReminderMinutes: nil,
            providerManaged: true,
            recurrence: .single(EventRecurrence_SinglePayload(kind: "single")),
            schedule: schedule,
            updatedAt: formatter.string(from: ekEvent.lastModifiedDate ?? now))
    }

    private static func isoFormatter() -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }

    private static func allDayDateString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

private extension CGColor {
    var hexRGB: String? {
        guard let components = components, components.count >= 3 else { return nil }
        let r = Int((components[0] * 255).rounded())
        let g = Int((components[1] * 255).rounded())
        let b = Int((components[2] * 255).rounded())
        return String(format: "#%02x%02x%02x", r, g, b)
    }
}
