import Foundation

/// Weekday day-jump letter prefixes. Mirrors web `DAY_JUMP_PREFIX_BY_WEEKDAY`.
public enum DayJumpPrefixes {
    public static func prefix(forWeekday sundayBased: Int) -> String {
        switch sundayBased {
        case 0: "su"
        case 1: "m"
        case 2: "t"
        case 3: "w"
        case 4: "r"
        case 5: "f"
        case 6: "sa"
        default: ""
        }
    }

    public static func displayName(forPrefix prefix: String) -> String {
        switch prefix.lowercased() {
        case "su": "Sunday"
        case "m": "Monday"
        case "t": "Tuesday"
        case "w": "Wednesday"
        case "r": "Thursday"
        case "f": "Friday"
        case "sa": "Saturday"
        default: prefix
        }
    }

    /// Maps a shifted letter key to a day prefix when unambiguous (M T W R F).
    public static func dayPrefix(forShiftedLetter letter: Character) -> String? {
        switch letter.lowercased().first {
        case "m": return "m"
        case "t": return "t"
        case "w": return "w"
        case "r": return "r"
        case "f": return "f"
        case "s": return "s"
        default: return nil
        }
    }
}
