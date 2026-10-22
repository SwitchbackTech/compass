import { type Id } from "react-toastify";
import { ToastActionButton } from "@web/common/utils/toast/ToastActionButton";
import { ToastNotice } from "@web/common/utils/toast/ToastNotice";
import { getToast } from "@web/common/utils/toast/toast.port";
import { openAuthModalFromOutsideRouter } from "@web/components/AuthModal/open-auth-modal.util";

interface SessionExpiredToastProps {
  toastId: Id;
}

export { openAuthModalFromOutsideRouter };

export const SessionExpiredToast = ({ toastId }: SessionExpiredToastProps) => {
  const handleSignIn = () => {
    void openAuthModalFromOutsideRouter("login");
    getToast().dismiss(toastId);
  };

  return (
    <ToastNotice>
      <p className="text-sm text-text">
        You've been signed out. Please sign in again.
      </p>
      <ToastActionButton onClick={handleSignIn}>Sign in</ToastActionButton>
    </ToastNotice>
  );
};
