import { useEffect } from "react";
import {
  showRecurrenceScopePromotionToast,
  showRecurrenceScopeToast,
} from "@web/common/utils/toast/recurrence-scope.toast";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import {
  recurrenceScopeOpportunityActions,
  selectRecurrenceScopeOpportunity,
  useRecurrenceScopeOpportunityStore,
} from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

const canHandleShortcut = (event: KeyboardEvent) =>
  !event.isComposing &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey;

export function RecurrenceScopeOpportunityHost() {
  const opportunity = useRecurrenceScopeOpportunityStore(
    selectRecurrenceScopeOpportunity,
  );
  const { promoteRecurring } = useEventMutations();
  const isReady = opportunity?.status === "ready";

  useAppShortcut(
    "1",
    (event) => {
      if (!opportunity || !canHandleShortcut(event)) return;
      recurrenceScopeOpportunityActions.requestPromotion(
        opportunity.id,
        "thisAndFollowing",
      );
    },
    {
      enabled: isReady,
      ignoreInputs: true,
      preventDefault: true,
      stopPropagation: true,
    },
  );
  useAppShortcut(
    "2",
    (event) => {
      if (!opportunity || !canHandleShortcut(event)) return;
      recurrenceScopeOpportunityActions.requestPromotion(opportunity.id, "all");
    },
    {
      enabled: isReady,
      ignoreInputs: true,
      preventDefault: true,
      stopPropagation: true,
    },
  );

  useEffect(() => {
    if (opportunity?.status !== "ready") return;
    showRecurrenceScopeToast(opportunity);
  }, [opportunity]);

  useEffect(() => {
    if (opportunity?.status !== "requested") return;
    const claimed = recurrenceScopeOpportunityActions.claimPromotion();
    if (!claimed?.requestedScope) return;
    showRecurrenceScopePromotionToast(claimed);
    promoteRecurring(claimed, claimed.requestedScope);
  }, [opportunity, promoteRecurring]);

  return null;
}
