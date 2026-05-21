export const buildWeekShortcutSections = ({
  isCurrentWeek,
}: {
  isCurrentWeek: boolean;
}) => [
  {
    title: "Week",
    shortcuts: [
      { k: "j", label: "Previous week" },
      { k: "k", label: "Next week" },
      {
        k: "t",
        label: isCurrentWeek ? "Scroll to now" : "Go to current week",
      },
    ],
  },
  {
    title: "Create",
    shortcuts: [
      { k: "c", label: "Create timed event" },
      { k: "a", label: "Create all-day event" },
      { k: "I", label: "Focus calendar event" },
      { k: "M", label: "Edit calendar event" },
      { k: "Shift+w", label: "Create Someday week event" },
      { k: "Shift+m", label: "Create Someday month event" },
    ],
  },
  {
    title: "Global",
    shortcuts: [
      { k: "d", label: "Day" },
      { k: "w", label: "Week" },
      { k: "n", label: "Now" },
      { k: "[", label: "Toggle sidebar" },
      { k: "?", label: "Toggle shortcuts" },
      { k: "Mod+k", label: "Command Palette" },
    ],
  },
];
