import { ShuffleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { getRandomLifeQuote } from "./life-quotes";

export function LifeQuote() {
  const [quote, setQuote] = useState(getRandomLifeQuote);

  return (
    <section className="flex items-start gap-1 text-text-muted">
      <blockquote aria-live="polite" className="min-w-0 flex-1 italic">
        {quote}
      </blockquote>
      <TooltipWrapper description="Show another quote">
        <button
          aria-label="Shuffle life quote"
          className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setQuote((current) => getRandomLifeQuote(current))}
          type="button"
        >
          <ShuffleIcon aria-hidden="true" size={17} />
        </button>
      </TooltipWrapper>
    </section>
  );
}
