import { useObservable } from "@ngneat/use-observable";
import { draft$ } from "@web/store/events";

export const useDraft = () => {
  const [draft] = useObservable(draft$);

  return draft;
};
