import classNames from "classnames";
import { type ReactNode, useCallback, useId, useState } from "react";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { pointerShortcutAttributes } from "@web/shortcuts/keyboard-only/pointer-action";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { FAQ_ITEMS } from "./faq";
import {
  flashedShortcutClass,
  useFlashedWelcomeShortcut,
} from "./useFlashedWelcomeShortcut";
import { useWelcomeJumpShortcuts } from "./useWelcomeJumpShortcuts";
import { WelcomeLinks } from "./WelcomeLinks";

export function WelcomeGuideBody({ children }: { children?: ReactNode }) {
  const disclosureIdPrefix = useId();
  const faqHintId = `${disclosureIdPrefix}-faq-hint`;
  const flashedKey = useFlashedWelcomeShortcut();
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleFaq = useCallback((question: string) => {
    setExpandedFaqs((currentFaqs) => {
      const nextFaqs = new Set(currentFaqs);

      if (nextFaqs.has(question)) {
        nextFaqs.delete(question);
      } else {
        nextFaqs.add(question);
      }

      return nextFaqs;
    });
  }, []);

  const toggleFaqAt = useCallback(
    (index: number) => {
      const item = FAQ_ITEMS[index];
      if (item) toggleFaq(item.question);
    },
    [toggleFaq],
  );

  useWelcomeJumpShortcuts(toggleFaqAt);

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h2 className="font-bold text-2xl text-text leading-snug">
          The Keyboard Calendar
        </h2>
        <p className="text-text-muted">
          Rediscover the joy of shortcuts as you build your perfect schedule. No
          clicks allowed.
        </p>
      </div>

      <div
        aria-describedby={faqHintId}
        className="flex w-full flex-col divide-y divide-border"
      >
        {FAQ_ITEMS.map((item, index) => {
          const isExpanded = expandedFaqs.has(item.question);
          const answerId = `${disclosureIdPrefix}-faq-answer-${index}`;
          const state = isExpanded ? "open" : "closed";
          const digit = String(index + 1);

          return (
            <div key={item.question} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  aria-controls={answerId}
                  aria-expanded={isExpanded}
                  className="c-focus-ring w-full cursor-pointer select-none text-left font-medium text-sm text-text transition-colors hover:text-text-lightest"
                  onClick={() => toggleFaq(item.question)}
                  {...pointerShortcutAttributes(digit)}
                >
                  {item.question}
                </button>
                <span
                  className={classNames(
                    "shrink-0",
                    flashedShortcutClass(flashedKey, digit),
                  )}
                >
                  <ShortcutHint>{digit}</ShortcutHint>
                </span>
              </div>
              <div
                id={answerId}
                aria-hidden={!isExpanded}
                className="c-disclosure-content"
                data-state={state}
              >
                <div>
                  <div className="mt-2 text-sm text-text-muted leading-relaxed">
                    {typeof item.answer === "string" ? (
                      item.answer
                    ) : (
                      <ShortcutTipParts parts={item.answer} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p id={faqHintId} className="text-text-muted text-xs leading-relaxed">
        Tip: Press a number to open a question or a link.
      </p>
      {children}
      <WelcomeLinks />
    </>
  );
}
