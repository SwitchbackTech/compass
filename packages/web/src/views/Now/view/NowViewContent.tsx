import { AvailableTasks } from "@web/views/Now/components/AvailableTasks/AvailableTasks";
import { FocusedTask } from "@web/views/Now/components/FocusedTask/FocusedTask";
import { UpcomingEvent } from "@web/views/Now/components/UpcomingEvent/UpcomingEvent";

export function NowViewContent() {
  return (
    <div className="flex h-screen w-full items-center justify-center gap-8 overflow-hidden px-6 py-8">
      {/* <ShortcutsOverlay /> */}

      <UpcomingEvent />

      <AvailableTasks />

      <FocusedTask />
    </div>
  );
}
