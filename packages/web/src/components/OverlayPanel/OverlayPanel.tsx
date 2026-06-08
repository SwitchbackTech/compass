import clsx from "clsx";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  /** Icon or element displayed at the top of the panel */
  icon?: ReactNode;
  /** Main title text */
  title?: string;
  /** Optional content rendered on the same row as the title (e.g. a switch link) */
  titleAction?: ReactNode;
  /** Description/message text */
  message?: string;
  /** Additional content (buttons, etc.) */
  children?: ReactNode;
  /** Called when clicking the backdrop or pressing Escape */
  onDismiss?: () => void;
  /** ARIA role for the panel (default: "dialog") */
  role?: "dialog" | "status" | "alert";
  /** Panel style variant */
  variant?: "modal" | "status";
}

export const OverlayPanel = ({
  icon,
  title,
  titleAction,
  message,
  children,
  onDismiss,
  role = "dialog",
  variant = "modal",
}: Props) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (role !== "dialog") return;
    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel).focus();
    return () => previouslyFocused?.focus?.();
  }, [role]);

  const backdropClasses = clsx(
    "fixed inset-0 flex items-center justify-center bg-bg-primary/85 backdrop-blur-sm",
  );

  const panelClasses = clsx("flex flex-col items-center", {
    "w-[400px] max-w-[90vw] gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]":
      variant === "modal",
    "max-w-sm gap-3 rounded-lg border border-border-primary bg-bg-secondary/90 px-6 py-5 shadow-lg":
      variant === "status",
  });

  const titleClasses = clsx(
    "m-0 line-clamp-2 w-full min-w-0 font-semibold text-lg text-text-lighter",
  );

  const messageClasses = clsx(
    "m-0 whitespace-pre-line text-base text-text-lighter",
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (onDismiss && e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onDismiss && e.key === "Escape") {
      onDismiss();
      return;
    }
    if (e.key === "Tab" && panelRef.current) {
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the panel.
    <div
      className={backdropClasses}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
      style={{ zIndex: Z_INDEX_MODAL }}
      tabIndex={-1}
    >
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-modal is only set when the panel role is dialog. */}
      <div
        ref={panelRef}
        className={panelClasses}
        role={role}
        tabIndex={role === "dialog" ? -1 : undefined}
        aria-modal={role === "dialog" ? true : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={message ? messageId : undefined}
        aria-live={role === "status" ? "polite" : undefined}
        aria-busy={role === "status" ? true : undefined}
      >
        {icon}
        {title && (
          <div className="flex w-full items-center justify-between gap-3">
            {variant === "modal" ? (
              <h2 id={titleId} className={titleClasses}>
                {title}
              </h2>
            ) : (
              <div id={titleId} className={titleClasses}>
                {title}
              </div>
            )}
            {titleAction}
          </div>
        )}
        {message && (
          <p id={messageId} className={messageClasses}>
            {message}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

interface OverlayPanelActionsProps {
  children: ReactNode;
}

export const OverlayPanelActions = ({ children }: OverlayPanelActionsProps) => (
  <div className="flex w-full justify-end gap-3">{children}</div>
);

interface OverlayPanelActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export const OverlayPanelActionButton = ({
  children,
  className,
  type = "button",
  variant = "secondary",
  ...buttonProps
}: OverlayPanelActionButtonProps) => (
  <button
    className={clsx(
      "h-11 rounded px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg disabled:pointer-events-none disabled:opacity-50",
      variant === "primary"
        ? "bg-accent-primary text-text-dark transition hover:brightness-110"
        : "border border-border-primary bg-panel-badge-bg text-text-lighter transition-colors hover:bg-panel-bg",
      className,
    )}
    type={type}
    {...buttonProps}
  >
    {children}
  </button>
);
