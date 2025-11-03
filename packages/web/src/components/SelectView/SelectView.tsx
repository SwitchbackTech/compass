import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const listRef = useRef<Array<HTMLElement | null>>([]);

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

  const getCurrentViewIndex = () => {
    const currentView = getCurrentView();
    if (currentView === "Now") return 0;
    if (currentView === "Day") return 1;
    return 2; // Week
  };

  const currentView = getCurrentView();
  const buttonLabel = displayLabel ?? currentView;

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (open) {
        // Initialize activeIndex to current view when opening
        setActiveIndex(getCurrentViewIndex());
      } else {
        setActiveIndex(null);
        listRef.current = [];
      }
    },
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });

  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role, listNavigation],
  );

  const handleOptionClick = (route: string) => {
    navigate(route);
    setIsOpen(false);
  };

  const options = [
    { route: ROOT_ROUTES.NOW, label: "Now", view: "Now" as const },
    { route: ROOT_ROUTES.DAY, label: "Day", view: "Day" as const },
    { route: ROOT_ROUTES.ROOT, label: "Week", view: "Week" as const },
  ];

  const dropdownId = "view-select-dropdown";

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
        aria-controls={isOpen ? dropdownId : undefined}
        aria-label={`Select view, currently ${currentView}`}
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
          {...getFloatingProps({
            onKeyDown: (e) => {
              if (
                activeIndex !== null &&
                (e.key === "Enter" || e.key === " ")
              ) {
                e.preventDefault();
                const option = options[activeIndex];
                if (option) {
                  handleOptionClick(option.route);
                }
              }
            },
          })}
          id={dropdownId}
          data-testid="view-select-dropdown"
          className="inset-inline-end-0 absolute top-full z-50 mt-1 min-w-[140px] rounded border border-gray-600 bg-gray-800 py-1 shadow-lg"
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = currentView === option.view;
            const isActive = activeIndex === index;

            return (
              <div
                key={option.route}
                ref={(node) => {
                  listRef.current[index] = node;
                }}
                {...getItemProps({
                  onClick: () => handleOptionClick(option.route),
                  active: isActive,
                })}
                role="option"
                aria-selected={isSelected}
                tabIndex={isActive ? 0 : -1}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:bg-white/10"
                } ${
                  isActive && !isSelected
                    ? "bg-white/15 ring-1 ring-white/30"
                    : ""
                }`}
              >
                <span>{option.label}</span>
                <ShortcutHint>{index + 1}</ShortcutHint>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
