import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { FAQ_ITEMS } from "./faq";
import { PixelPirate } from "./PixelPirate";
import { hasSeenWelcome, markWelcomeSeen } from "./welcome.modal.util";

export function WelcomeModal() {
  const { authenticated } = useContext(SessionContext);
  const { openModal, isOpen: isAuthModalOpen } = useAuthModal();
  const disclosureIdPrefix = useId();
  const [isOpen, setIsOpen] = useState(
    () => !authenticated && !hasSeenWelcome(),
  );
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(
    () => new Set(),
  );
  const [closing, setClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // The auth modal's openness lives in the URL (?auth=), so the welcome
  // screen simply hides while it is open and reappears when the browser
  // back button (or Escape) removes the param again.
  const visible = isOpen && !isAuthModalOpen && !authenticated;

  useEffect(() => {
    if (visible) {
      backdropRef.current?.focus();
    }
  }, [visible]);

  if (!visible) return null;

  // Fade the backdrop and gently scale the panel before unmounting, so the
  // first reveal of the planner underneath feels smooth rather than abrupt.
  const dismiss = () => {
    if (closing) return;
    markWelcomeSeen();
    setClosing(true);
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.setTimeout(() => setIsOpen(false), reduceMotion ? 0 : 400);
  };

  const handleLogIn = () => {
    markWelcomeSeen();
    openModal("login");
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      dismiss();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      dismiss();
    }
  };

  const toggleFaq = (question: string) => {
    setExpandedFaqs((currentFaqs) => {
      const nextFaqs = new Set(currentFaqs);

      if (nextFaqs.has(question)) {
        nextFaqs.delete(question);
      } else {
        nextFaqs.add(question);
      }

      return nextFaqs;
    });
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the welcome modal.
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-bg-primary/85 py-8 backdrop-blur-sm transition-opacity duration-400 ease-out data-closing:opacity-0 motion-reduce:transition-none"
      data-closing={closing || undefined}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      ref={backdropRef}
      role="presentation"
      style={{ zIndex: Z_INDEX_MODAL }}
      tabIndex={-1}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Welcome to Compass Calendar"
        data-closing={closing || undefined}
        className="flex w-120 max-w-[90vw] flex-col gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-transform duration-400 ease-out data-closing:scale-105 motion-reduce:transition-none"
      >
        {/* Top row: pirate top-left, log-in pill top-right */}
        <div className="flex items-center justify-between">
          <div className="group relative flex items-center">
            <PixelPirate className="h-14 w-14 shrink-0" />
            {/* Speech bubble, revealed on hover; tail points at the pirate */}
            <div className="pointer-events-none absolute left-full ml-1 flex -translate-x-1 items-center opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
              <span
                aria-hidden
                className="h-0 w-0 border-y-4 border-y-transparent border-r-4 border-r-panel-badge-bg"
              />
              <span className="whitespace-nowrap rounded-lg bg-panel-badge-bg px-3 py-1 font-[VT323,monospace] text-base text-text-lighter">
                No signup required
              </span>
            </div>
          </div>
          {/* bg matches the pirate's shirt gray (PixelPirate.tsx) */}
          <button
            type="button"
            onClick={handleLogIn}
            className="shrink-0 rounded-3xl bg-[#c2c6cc] px-4 py-1.5 text-[#1f1f1f] text-xs transition-all hover:bg-[#d1d5da]"
          >
            Log in
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-2xl text-text-lighter leading-snug">
            Compass Calendar helps you manage your time, simply.
          </h2>
          <p className="text-text-light">
            A small, but mighty calendar/todo app. Built for busy minimalists
            who get things done.
          </p>
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={dismiss}
            className="c-button c-button-primary rounded-full px-10"
          >
            Start Now
          </button>
        </div>

        {/* FAQ */}
        <div className="flex flex-col divide-y divide-border-primary">
          {FAQ_ITEMS.map((item, index) => {
            const isExpanded = expandedFaqs.has(item.question);
            const answerId = `${disclosureIdPrefix}-faq-answer-${index}`;
            const state = isExpanded ? "open" : "closed";

            return (
              <div key={item.question} className="py-3">
                <button
                  type="button"
                  aria-controls={answerId}
                  aria-expanded={isExpanded}
                  className="c-focus-ring w-full cursor-pointer select-none text-left font-medium text-sm text-text-lighter transition-colors hover:text-text-lightest"
                  onClick={() => toggleFaq(item.question)}
                >
                  {item.question}
                </button>
                <div
                  id={answerId}
                  aria-hidden={!isExpanded}
                  className="c-disclosure-content"
                  data-state={state}
                >
                  <div>
                    <div className="mt-2 text-sm text-text-light leading-relaxed">
                      {item.answer !== null ? (
                        item.answer
                      ) : (
                        <>
                          Yes! The repo includes the API, frontend, CLI, and
                          more. You can run it yourself too; read the{" "}
                          <a
                            href="/blog/self-host"
                            className="c-focus-ring font-medium text-accent-primary underline-offset-4 hover:underline"
                          >
                            self-hosting guide
                          </a>{" "}
                          to set up your own instance.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: social + legal */}
        <div className="flex items-center justify-between border-border-primary border-t pt-4">
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/CompassCalendar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="c-focus-ring text-text-light transition-colors hover:text-text-lighter"
            >
              <XLogoIcon size={18} weight="bold" />
            </a>
            <a
              href="https://www.linkedin.com/company/compass-calendar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="c-focus-ring text-text-light transition-colors hover:text-text-lighter"
            >
              <LinkedinLogoIcon size={18} weight="bold" />
            </a>
            <a
              href="https://www.github.com/SwitchbackTech/compass-calendar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="c-focus-ring text-text-light transition-colors hover:text-text-lighter"
            >
              <GithubLogoIcon size={18} weight="bold" />
            </a>
          </div>
          <div className="flex items-center gap-4 text-text-light text-xs">
            <a
              href="https://compasscalendar.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="c-focus-ring underline-offset-4 hover:text-text-lighter hover:underline"
            >
              Privacy
            </a>
            <a
              href="https://compasscalendar.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="c-focus-ring underline-offset-4 hover:text-text-lighter hover:underline"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
