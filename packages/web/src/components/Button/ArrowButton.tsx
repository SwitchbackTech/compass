import { ChevronLeftIcon } from "@web/views/Day/components/Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "@web/views/Day/components/Icons/ChevronRightIcon";

export const ArrowButton = ({
  direction,
  label,
  onClick,
}: {
  direction: "left" | "right";
  label: string;
  onClick: () => void;
}) => {
  const hoverColor = "bg-white/20";

  return (
    <button
      className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors hover:${hoverColor} focus:${hoverColor} focus:ring-2 focus:ring-white/50 focus:outline-none`}
      aria-label={label}
      onClick={onClick}
    >
      {direction === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
};
