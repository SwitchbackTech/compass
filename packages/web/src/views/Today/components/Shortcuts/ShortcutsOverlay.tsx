import { ShortcutHint } from "@web/views/Today/components/Shortcuts/ShortcutHint";

type Item = { k: string; label: string };

const List = ({ items }: { items: Item[] }) => {
  if (!items.length) return null;
  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li
          key={it.k}
          className="flex items-center gap-2 text-xs text-white/90"
        >
          <ShortcutHint>{it.k}</ShortcutHint>
          <span className="truncate">{it.label}</span>
        </li>
      ))}
    </ul>
  );
};

const Section = ({ title, items }: { title: string; items: Item[] }) => {
  if (!items.length) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] tracking-wide text-white/50 uppercase">
        {title}
      </div>
      <List items={items} />
    </div>
  );
};

export const ShortcutsOverlay = () => {
  const global: Item[] = [
    { k: "0", label: "Home" },
    { k: "1", label: "Now" },
    { k: "2", label: "Today" },
    { k: "3", label: "Week" },
  ];

  const isToday = true;
  const isHome = false;
  const isNow = false;

  let homeItems: Item[] = [];
  let todayTask: Item[] = [];
  let todayCalendar: Item[] = [];
  let nowItems: Item[] = [];

  if (isHome) {
    homeItems = [
      { k: "j", label: "Previous day" },
      { k: "k", label: "Next day" },
      { k: "Enter", label: "Go to Today" },
    ];
  } else if (isToday) {
    todayTask = [
      { k: "u", label: "Focus on tasks" },
      { k: "c", label: "Create task" },
      { k: "e", label: "Edit task" },
      { k: "Delete", label: "Delete task" },
      { k: "t", label: "Go to today" },
    ];
    todayCalendar = [
      { k: "i", label: "Focus on calendar" },
      { k: "e", label: "Edit event title" },
      { k: "Delete", label: "Delete event" },
      { k: "↑", label: "Move up 15m" },
      { k: "↓", label: "Move down 15m" },
    ];
  } else if (isNow) {
    nowItems = [
      { k: "j", label: "Previous task" },
      { k: "k", label: "Next task" },
      { k: "Enter", label: "Complete focused task" },
      { k: "Esc", label: "Back to Today" },
    ];
  }

  const show =
    global.length ||
    homeItems.length ||
    todayTask.length ||
    todayCalendar.length ||
    nowItems.length;
  if (!show) return null;

  return (
    <aside
      aria-label="Shortcut overlay"
      className="fixed top-24 left-3 z-30 hidden w-[240px] rounded-lg border border-white/10 bg-[#1e1e1e]/90 p-3 shadow-lg backdrop-blur-sm md:block"
    >
      <div className="mb-2 text-xs font-medium text-white">Shortcuts</div>
      {isHome && <Section title="Home" items={homeItems} />}
      {isToday && (
        <>
          <Section title="Tasks" items={todayTask} />
          <Section title="Calendar" items={todayCalendar} />
        </>
      )}
      {isNow && <Section title="Now" items={nowItems} />}
      <Section title="Global" items={global} />
    </aside>
  );
};
