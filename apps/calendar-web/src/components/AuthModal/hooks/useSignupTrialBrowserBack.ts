import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { dismissSignupTrialStep } from "@web/components/AuthModal/dismiss-signup-trial-step";

/** Browser Back from the signup trial step must not replay OAuth callbacks. */
export function useSignupTrialBrowserBack(isActive: boolean): void {
  const navigate = useNavigate();
  const activeRef = useRef(isActive);
  const dismissingRef = useRef(false);

  activeRef.current = isActive;

  useEffect(() => {
    if (!isActive) return;

    const onPopState = () => {
      if (!activeRef.current || dismissingRef.current) return;

      dismissingRef.current = true;
      dismissSignupTrialStep(navigate, { trackAbandon: true });
      dismissingRef.current = false;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isActive, navigate]);
}
