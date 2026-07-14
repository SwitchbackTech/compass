import { ChevronLeftIcon } from "@web/components/Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "@web/components/Icons/ChevronRightIcon";

export const ArrowButton = ({
  direction,
  label,
  onClick,
  tabIndex,
}: {
  direction: "left" | "right";
  label: string;
  tabIndex?: number;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      className="flex h-6 w-6 items-center justify-center rounded-full text-text-lighter transition-colors hover:bg-text-lighter/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      aria-label={label}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      {direction === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
};
