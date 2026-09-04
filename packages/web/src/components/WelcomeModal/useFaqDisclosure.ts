import { useCallback, useState } from "react";
import { FAQ_ITEMS } from "./faq";

/** Which FAQ rows are open, keyed by question, plus toggles by question or index. */
export function useFaqDisclosure() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((question: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  }, []);

  const toggleAt = useCallback(
    (index: number) => {
      const item = FAQ_ITEMS[index];
      if (item) toggle(item.question);
    },
    [toggle],
  );

  return { expanded, toggle, toggleAt };
}
