import classNames from "classnames";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useAppLockReason } from "@web/shortcuts/app-lock";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

interface Props {
  /** Icon or element displayed at the top of the panel */
  icon?: ReactNode;
  /** Main title text */
  title?: string;
  /** Accessible name when the panel has no visible title */
  ariaLabel?: string;
  /** Optional content rendered on the same row as the title (e.g. a switch link) */
  titleAction?: ReactNode;
  /** Description/message text */
  message?: string;
  /** Additional content (buttons, etc.) */
  children?: ReactNode;
  /** Called when clicking the backdrop or pressing Escape */
  onDismiss?: () => void;
  /** Called when pressing Shift+Escape; falls back to onDismiss when omitted. */
  onShiftEscape?: () => void;
  /** Focus this element on open instead of the first focusable in the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Overrides the element that receives focus when the dialog closes. */
  restoreFocus?: () => void;
  /**
   * When `.current` is true at unmount, skip focus restore — for dialog-to-dialog
   * handoffs where the next dialog will seat focus itself.
   */
  skipFocusRestoreRef?: RefObject<boolean>;
  /** ARIA role for the panel (default: "dialog") */
  role?: "dialog" | "status" | "alert";
  /** Cross-axis alignment of the title/message/children (default: "center") */
  align?: "center" | "start";
  /** Panel style variant */
  variant?: "modal" | "status";
  /** Tailwind width class for the modal variant (default: "w-[400px]") */
  widthClassName?: string;
  /** Extra classes for the backdrop (e.g. overflow for tall dialogs) */
  backdropClassName?: string;
  /** When true, applies dismiss-transition `data-closing` styles before unmount */
  closing?: boolean;
}

export const OverlayPanel = ({
  icon,
  title,
  ariaLabel,
  titleAction,
  message,
  children,
  onDismiss,
  onShiftEscape,
  initialFocusRef,
  restoreFocus,
  skipFocusRestoreRef,
  role = "dialog",
  align = "center",
  variant = "modal",
  widthClassName = "w-[400px]",
  backdropClassName,
  closing = false,
}: Props) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const messageId = `${baseId}-message`;
  // Unique per instance: app-lock reasons are a Set, not refcounted.
  useAppLockReason(`overlayPanel:${baseId}`, true);

  useEffect(() => {
    if (role !== "dialog") return;
    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const [firstFocusable] = getFocusableElements(panel);
    const initialFocus = initialFocusRef?.current ?? firstFocusable ?? panel;
    initialFocus.focus();
    return () => {
      // Read at unmount so callers can suppress restore for dialog handoffs.
      if (skipFocusRestoreRef?.current) return;
      // Sync restore is safe: app-lock is still held during this cleanup
      // (registered before this effect), so document Escape consumers that
      // respect the lock stand down. OverlayPanel also stopPropagates Escape.
      if (restoreFocus) restoreFocus();
      else previouslyFocused?.focus?.();
    };
  }, [initialFocusRef, restoreFocus, role, skipFocusRestoreRef]);

  const backdropClasses = classNames(
    "fixed inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm",
    variant === "modal" &&
      "transition-opacity duration-400 ease-out data-closing:opacity-0 motion-reduce:transition-none",
    backdropClassName,
  );

  const panelClasses = classNames(
    "flex flex-col",
    align === "start" ? "items-start" : "items-center",
    variant === "modal" && [
      widthClassName,
      "max-w-[90vw] gap-6 rounded-xl bg-surface-panel p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]",
      "transition-transform duration-400 ease-out data-closing:scale-105 motion-reduce:transition-none",
    ],
    variant === "status" &&
      "max-w-sm gap-3 rounded-lg border border-border bg-surface/90 px-6 py-5 shadow-lg",
  );

  const titleClasses = classNames(
    "m-0 line-clamp-2 w-full min-w-0 font-semibold text-lg text-text",
  );

  const messageClasses = classNames(
    "m-0 whitespace-pre-line text-base text-text",
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (onDismiss && e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (e.shiftKey && onShiftEscape) {
        e.preventDefault();
        e.stopPropagation();
        onShiftEscape();
        return;
      }
      if (onDismiss) {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
        return;
      }
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusables = getFocusableElements(panelRef.current);
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
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the panel.
    <div
      className={backdropClasses}
      data-closing={closing || undefined}
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
        data-closing={closing || undefined}
        role={role}
        tabIndex={role === "dialog" ? -1 : undefined}
        aria-modal={role === "dialog" ? true : undefined}
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={message ? messageId : undefined}
        aria-live={role === "status" ? "polite" : undefined}
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
  /** Horizontal alignment of the action buttons (default: "end") */
  align?: "start" | "end";
}

export const OverlayPanelActions = ({
  children,
  align = "end",
}: OverlayPanelActionsProps) => (
  <div
    className={classNames(
      "flex w-full gap-3",
      align === "start" ? "justify-start" : "justify-end",
    )}
  >
    {children}
  </div>
);

interface OverlayPanelActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive";
}

export const OverlayPanelActionButton = forwardRef<
  HTMLButtonElement,
  OverlayPanelActionButtonProps
>(function OverlayPanelActionButton(
  {
    children,
    className,
    type = "button",
    variant = "secondary",
    ...buttonProps
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={classNames(
        "h-11 rounded px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-accent text-on-accent transition hover:brightness-110",
        variant === "destructive" &&
          "bg-error text-on-accent transition hover:brightness-110",
        variant === "secondary" &&
          "border border-border bg-surface-overlay text-text transition-colors hover:bg-surface-panel",
        className,
      )}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
});
