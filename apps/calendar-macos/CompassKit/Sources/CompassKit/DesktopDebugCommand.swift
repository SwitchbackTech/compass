import Foundation

/// `compass://debug/...` commands that drive a Debug build from the shell
/// (`open -g "compass://debug/today"`), so the app can be tested without
/// taking keyboard focus. Only the app target's Debug configuration reads
/// these; release builds never parse them.
///
/// - `compass://debug/create?title=Standup&start=2026-10-15T09:30&minutes=30`
///   (`start` is local wall time in the effective time zone; omitted means the
///   next keyboard-create slot. `minutes` defaults to 60.)
/// - `compass://debug/delete?id=<event id>`
/// - `compass://debug/undo`, `compass://debug/redo`
/// - `compass://debug/today`
/// - `compass://debug/goto?date=2026-06-10`
/// - `compass://debug/view/day`, `/view/week`, `/view/life`
public enum DesktopDebugCommand: Equatable, Sendable {
    public enum View: String, Sendable {
        case day
        case week
        case life
    }

    case create(title: String, start: String?, minutes: Int)
    case delete(eventId: String)
    case undo
    case redo
    case today
    case goTo(date: String)
    case view(View)
    case parityExport(surface: String)
    case parityApplyCaptureWindow

    private static let prefix = "compass://debug/"
    private static let defaultMinutes = 60
    private static let maxMinutes = 24 * 60

    public static func parse(_ urlString: String) -> DesktopDebugCommand? {
        guard urlString.lowercased().hasPrefix(prefix),
            let components = URLComponents(string: urlString)
        else { return nil }

        let path = urlString.dropFirst(prefix.count)
            .split(separator: "?", maxSplits: 1).first.map(String.init) ?? ""
        let segments = path.split(separator: "/").map { $0.lowercased() }
        var query: [String: String] = [:]
        for item in components.queryItems ?? [] {
            if let value = item.value { query[item.name] = value }
        }

        switch segments.first {
        case "create":
            let title = query["title"]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !title.isEmpty else { return nil }
            let start = query["start"].flatMap { isLocalDateTime($0) ? $0 : nil }
            if query["start"] != nil, start == nil { return nil }
            let minutes = query["minutes"].flatMap(Int.init) ?? defaultMinutes
            guard (1...maxMinutes).contains(minutes) else { return nil }
            return .create(title: title, start: start, minutes: minutes)
        case "delete":
            guard let id = query["id"], !id.isEmpty else { return nil }
            return .delete(eventId: id)
        case "undo":
            return .undo
        case "redo":
            return .redo
        case "today":
            return .today
        case "goto":
            guard let date = query["date"], isCalendarDay(date) else { return nil }
            return .goTo(date: date)
        case "view":
            guard segments.count > 1, let view = View(rawValue: segments[1]) else { return nil }
            return .view(view)
        case "parity-export":
            guard let name = query["name"], ParityCaptureSurface.isValid(name) else { return nil }
            return .parityExport(surface: name)
        case "parity-apply-capture-window":
            return .parityApplyCaptureWindow
        default:
            return nil
        }
    }

    private static func isCalendarDay(_ value: String) -> Bool {
        matches(value, format: "yyyy-MM-dd")
    }

    private static func isLocalDateTime(_ value: String) -> Bool {
        matches(value, format: "yyyy-MM-dd'T'HH:mm")
    }

    private static func matches(_ value: String, format: String) -> Bool {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = format
        guard let date = formatter.date(from: value) else { return false }
        return formatter.string(from: date) == value
    }
}
