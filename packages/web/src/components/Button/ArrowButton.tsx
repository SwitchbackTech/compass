import { ChevronLeftIcon } from "@web/views/Day/components/Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "@web/views/Day/components/Icons/ChevronRightIcon";

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
  const hoverColor = "bg-text-lighter/20";

  return (
    <button
      type="button"
      className={`flex h-6 w-6 items-center justify-center rounded-full text-text-lighter transition-colors hover:${hoverColor} focus:${hoverColor} focus:outline-none focus:ring-2 focus:ring-text-lighter/50`}
      aria-label={label}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      {direction === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
};
