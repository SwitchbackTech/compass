import Foundation

public enum EventFormMeetingLink {
    public static let copiedToastId = "meeting-link-copied"

    public static func url(isEditDraft: Bool, baseline: Event?) -> String? {
        guard isEditDraft else { return nil }
        guard let baseline, case .details(let payload) = baseline.content else { return nil }
        let trimmed = payload.conference?.url.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }

    public static func label(baseline: Event?) -> String {
        guard let baseline, case .details(let payload) = baseline.content else {
            return "Join meeting"
        }
        let trimmed = payload.conference?.label?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "Join meeting" : trimmed
    }
}
