import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
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
import { useWelcomeBackNav } from "./useWelcomeBackNav";
import { hasSeenWelcome, markWelcomeSeen } from "./welcome.modal.util";

export function WelcomeModal() {
  const { authenticated } = useContext(SessionContext);
  const { openModal, closeModal, isOpen: isAuthModalOpen } = useAuthModal();
  const disclosureIdPrefix = useId();
  const [isOpen, setIsOpen] = useState(
    () => !authenticated && !hasSeenWelcome(),
  );
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(
    () => new Set(),
  );
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleBackToWelcome = useCallback(() => {
    if (!authenticated) {
      setIsOpen(true);
    }
  }, [authenticated]);
  const { pushAuthEntry } = useWelcomeBackNav({
    isAuthModalOpen,
    closeAuthModal: closeModal,
    onBackToWelcome: handleBackToWelcome,
  });

  useEffect(() => {
    if (isOpen) {
      backdropRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const dismiss = () => {
    markWelcomeSeen();
    setIsOpen(false);
  };

  const handleLogIn = () => {
    markWelcomeSeen();
    setIsOpen(false);
    pushAuthEntry();
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
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-bg-primary/85 py-8 backdrop-blur-sm"
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
        className="flex w-120 max-w-[90vw] flex-col gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
      >
        {/* Top row: log-in pill, top-right */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleLogIn}
            className="shrink-0 rounded-3xl border border-[#1f1f1f] bg-white px-4 py-1.5 text-[#1f1f1f] text-xs transition-all hover:bg-[#f0f0f0]"
          >
            Log in
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-2xl text-text-lighter leading-snug">
            Compass Calendar is a simple app that helps you manage your time.
          </h2>
          <p className="text-text-light">
            Minimal, yet fast and intuitive. We cut out all the noise so you can
            reclaim control of your time.
          </p>
        </div>

        {/* CTA: centered pill button + mascot */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="c-button c-button-primary rounded-full px-10"
          >
            Start Now
          </button>
          <div className="flex items-center gap-1">
            <PixelPirate className="h-14 w-14 shrink-0" />
            <div className="relative rounded-lg border border-border-primary bg-panel-badge-bg px-3 py-1.5 text-text-lighter text-xs">
              <span
                aria-hidden
                className="-left-1 -translate-y-1/2 absolute top-1/2 h-2 w-2 rotate-45 border-border-primary border-b border-l bg-panel-badge-bg"
              />
              No signup required
            </div>
          </div>
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
