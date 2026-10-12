/// Web `FAQ_ITEMS` (`components/WelcomeModal/faq.ts`). Digits 1-5 toggle them.
public enum WelcomeFaq {
    public struct Item: Sendable {
        public let question: String
        public let answer: String
    }

    public static let items: [Item] = [
        Item(
            question: "Who is Compass for?",
            answer: "Compass is for busy professionals who live at their keyboard."
        ),
        Item(
            question: "How is Compass different?",
            answer: "Everything here is faster, simpler, open-source...er."
        ),
        Item(
            question: "What does 'the keyboard calendar' actually mean?",
            answer: "You can target any element on screen without endless Tabbing, chain shortcuts into "
                + "sequences, and pull up a command palette for anything you can't remember. Compass "
                + "surfaces the right shortcut at the right moment instead of dumping the full list on "
                + "you. It feels a bit like playing Tetris."
        ),
        Item(
            question: "Why doesn't my mouse work?",
            answer: "The calendar grid does not open or create from clicks alone. Click an event or an "
                + "empty slot once and Compass shows the keys that do it. Key hints beside controls and "
                + "? show the rest. This welcome screen works with your mouse, too: every button and "
                + "link here responds to a click."
        ),
        Item(
            question: "I don't know any shortcuts yet. Will I be lost?",
            answer: "No. The practice arena walks you through the core shortcut patterns, hints appear "
                + "right when they're useful, and ? opens the full legend. ⌘K opens a command palette "
                + "for anything you can't remember."
        ),
    ]
}
