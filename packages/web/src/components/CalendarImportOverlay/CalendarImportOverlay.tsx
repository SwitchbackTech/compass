import { StyledSpinner } from "@web/components/AbsoluteOverflowLoader/styled";

export const CalendarImportOverlay = () => (
  <div className="absolute top-0 left-0 z-[999] flex h-full w-full items-center justify-center backdrop-blur-[5px]">
    <div className="flex flex-col items-center gap-6">
      <StyledSpinner />
      <div className="flex flex-col gap-2">
        <div className="text-center text-xl font-medium text-white">
          Importing your Google Calendar events...
        </div>
        <div className="text-center text-sm text-white/80">
          This may take a minute. Please don&apos;t close this tab.
        </div>
      </div>
    </div>
  </div>
);
