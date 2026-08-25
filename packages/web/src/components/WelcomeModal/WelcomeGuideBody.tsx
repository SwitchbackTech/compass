import { useCallback, useId, useState } from "react";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { FAQ_ITEMS } from "./faq";
import { useWelcomeFaqShortcuts } from "./useWelcomeFaqShortcuts";

export function WelcomeGuideBody() {
  const disclosureIdPrefix = useId();
  const faqHintId = `${disclosureIdPrefix}-faq-hint`;
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

  const isModHeld = useWelcomeFaqShortcuts(toggleFaqAt);

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h2 className="font-bold text-2xl text-text leading-snug">
          Keyboard calendar
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

          return (
            <div key={item.question} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  aria-controls={answerId}
                  aria-expanded={isExpanded}
                  className="c-focus-ring w-full cursor-pointer select-none text-left font-medium text-sm text-text transition-colors hover:text-text-lightest"
                  onClick={() => toggleFaq(item.question)}
                >
                  {item.question}
                </button>
                {isModHeld && (
                  <ShortcutHint className="shrink-0">{index + 1}</ShortcutHint>
                )}
              </div>
              <div
                id={answerId}
                aria-hidden={!isExpanded}
                className="c-disclosure-content"
                data-state={state}
              >
                <div>
                  <div className="mt-2 text-sm text-text-muted leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p
        id={faqHintId}
        className="flex flex-wrap items-center gap-1 text-text-muted text-xs"
      >
        Hold
        <ShortcutKeys keys={["Mod"]} />
        to see keys, then press 1–5. The same hold reveals jump keys all over
        Compass.
      </p>
    </>
  );
}
