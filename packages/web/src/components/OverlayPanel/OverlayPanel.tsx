import clsx from "clsx";
import { ReactNode } from "react";

interface Props {
  /** Icon or element displayed at the top of the panel */
  icon?: ReactNode;
  /** Main title text */
  title?: string;
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
  message,
  children,
  onDismiss,
  role = "dialog",
  variant = "modal",
}: Props) => {
  const backdropClasses = clsx(
    "fixed inset-0 z-[1000] flex items-center justify-center bg-bg-primary/85 backdrop-blur-sm",
  );

  const panelClasses = clsx("flex flex-col items-center", {
    "bg-panel-bg w-[400px] max-w-[90vw] gap-6 rounded-xl p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]":
      variant === "modal",
    "border-border-primary bg-bg-secondary/90 max-w-sm gap-3 rounded-lg border px-6 py-5 shadow-lg":
      variant === "status",
  });

  const titleClasses = clsx(
    "text-text-lighter m-0 w-full min-w-0 line-clamp-2 text-lg font-semibold",
  );

  const messageClasses = clsx(
    "text-text-lighter m-0 text-base whitespace-pre-line",
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (onDismiss && e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onDismiss && e.key === "Escape") {
      onDismiss();
    }
  };

  return (
    <div
      className={backdropClasses}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
      tabIndex={-1}
    >
      <div
        className={panelClasses}
        role={role}
        aria-modal={role === "dialog" ? true : undefined}
        aria-live={role === "status" ? "polite" : undefined}
        aria-busy={role === "status" ? true : undefined}
      >
        {icon}
        {title &&
          (variant === "modal" ? (
            <h2 className={titleClasses}>{title}</h2>
          ) : (
            <div className={titleClasses}>{title}</div>
          ))}
        {message && <p className={messageClasses}>{message}</p>}
        {children}
      </div>
    </div>
  );
};
