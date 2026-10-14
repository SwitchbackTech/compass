import classNames from "classnames";
import { type ReactNode } from "react";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";

const PROVIDER_MANAGED_TOAST_ID = "provider-managed-field";

interface ProviderManagedFieldShieldProps {
  active: boolean;
  message: string;
  className?: string;
  children: ReactNode;
}

/**
 * Sits above a disabled schedule block so pointer and keyboard attempts still
 * get a short explanation (native disabled controls stay silent).
 */
export const ProviderManagedFieldShield = ({
  active,
  message,
  className,
  children,
}: ProviderManagedFieldShieldProps) => {
  const notify = () => {
    showStatusToast(PROVIDER_MANAGED_TOAST_ID, message);
  };

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className={classNames("relative", className)}>
      {children}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] cursor-not-allowed"
        onFocusCapture={() => {
          notify();
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          notify();
        }}
      />
    </div>
  );
};
