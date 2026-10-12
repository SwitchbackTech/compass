import classNames from "classnames";
import { WELCOME_STEPS, type WelcomeStep } from "./welcome-steps";

/** Progress dots under the welcome screens, with an sr-only step count. */
export function WelcomeSteps({ step }: { step: WelcomeStep }) {
  return (
    <div className="flex w-full items-center justify-center gap-2">
      <span className="sr-only">
        Step {step} of {WELCOME_STEPS.length}
      </span>
      {WELCOME_STEPS.map((dot) => (
        <span
          key={dot}
          aria-hidden
          className={classNames(
            "h-1.5 w-1.5 rounded-full transition-colors",
            dot === step ? "bg-text" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}
