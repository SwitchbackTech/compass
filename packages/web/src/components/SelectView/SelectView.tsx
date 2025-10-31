import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ShortcutHint } from "@web/views/Day/components/Shortcuts/components/ShortcutHint";

interface SelectViewProps {
  displayLabel?: string;
  buttonClassName?: string;
}

export const SelectView = ({
  displayLabel,
  buttonClassName,
}: SelectViewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentView = () => {
    const pathname = location.pathname;
    if (
      pathname === ROOT_ROUTES.NOW ||
      pathname.startsWith(`${ROOT_ROUTES.NOW}/`)
    ) {
      return "Now";
    }
    if (
      pathname === ROOT_ROUTES.DAY ||
      pathname.startsWith(`${ROOT_ROUTES.DAY}/`)
    ) {
      return "Day";
    }
    if (pathname === ROOT_ROUTES.ROOT) {
      return "Week";
    }
    return "Week";
  };

  const currentView = getCurrentView();
  const buttonLabel = displayLabel ?? currentView;

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  const handleOptionClick = (route: string) => {
    navigate(route);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className={
          buttonClassName ??
          "flex items-center gap-2 rounded px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/10"
        }
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{buttonLabel}</span>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={refs.setFloating}
          {...getFloatingProps()}
          data-testid="view-select-dropdown"
          className="absolute top-full right-0 z-50 mt-1 min-w-[140px] rounded border border-gray-600 bg-gray-800 py-1 shadow-lg"
          role="listbox"
        >
          <button
            onClick={() => handleOptionClick(ROOT_ROUTES.NOW)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              currentView === "Now"
                ? "bg-white/20 text-white"
                : "text-white/90 hover:bg-white/10"
            }`}
            role="option"
            aria-selected={currentView === "Now"}
          >
            <span>Now</span>
            <ShortcutHint>1</ShortcutHint>
          </button>
          <button
            onClick={() => handleOptionClick(ROOT_ROUTES.DAY)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              currentView === "Day"
                ? "bg-white/20 text-white"
                : "text-white/90 hover:bg-white/10"
            }`}
            role="option"
            aria-selected={currentView === "Day"}
          >
            <span>Day</span>
            <ShortcutHint>2</ShortcutHint>
          </button>
          <button
            onClick={() => handleOptionClick(ROOT_ROUTES.ROOT)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              currentView === "Week"
                ? "bg-white/20 text-white"
                : "text-white/90 hover:bg-white/10"
            }`}
            role="option"
            aria-selected={currentView === "Week"}
          >
            <span>Week</span>
            <ShortcutHint>3</ShortcutHint>
          </button>
        </div>
      )}
    </div>
  );
};
