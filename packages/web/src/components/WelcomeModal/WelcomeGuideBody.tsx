import { CaretDownIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { useId, useState } from "react";
import { FAQ_ITEMS } from "./faq";

export function WelcomeGuideBody() {
  const disclosureIdPrefix = useId();
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(
    () => new Set(),
  );

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
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-bold text-2xl text-text leading-snug">
          Compass Calendar helps you manage your time, simply.
        </h2>
        <p className="text-text-muted">
          A small, but mighty calendar app. Built for busy minimalists who get
          things done.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
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
                className="c-focus-ring flex w-full cursor-pointer select-none items-center justify-between gap-2 text-left font-medium text-sm text-text transition-colors hover:text-text-lightest"
                onClick={() => toggleFaq(item.question)}
              >
                <span>{item.question}</span>
                <CaretDownIcon
                  aria-hidden="true"
                  className={classNames(
                    "shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isExpanded && "rotate-180",
                  )}
                  size={14}
                />
              </button>
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
    </>
  );
}
