import { useEffect } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import {
  showRecurrenceScopePromotionToast,
  showRecurrenceScopeToast,
} from "@web/common/utils/toast/recurrence-scope.toast";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import {
  isRecurrenceScopeAskReady,
  recurrenceScopeOpportunityActions,
  selectRecurrenceScopeOpportunity,
  useRecurrenceScopeOpportunityStore,
} from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { recurrenceScopeForToastDigit } from "@web/events/recurrence/recurrence-scope-toast-digit";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";

export function RecurrenceScopeOpportunityHost() {
  const opportunity = useRecurrenceScopeOpportunityStore(
    selectRecurrenceScopeOpportunity,
  );
  const { promoteRecurring } = useEventMutations();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!isRecurrenceScopeAskReady()) return;
      if (
        event.isComposing ||
        isAppLocked() ||
        isEditableKeyboardTarget(event) ||
        isEditSequenceArmed()
      ) {
        return;
      }

      const scope = recurrenceScopeForToastDigit(event);
      if (!scope) return;

      const current = useRecurrenceScopeOpportunityStore.getState().opportunity;
      if (!current || current.status !== "ready") return;

      event.preventDefault();
      event.stopPropagation();
      recurrenceScopeOpportunityActions.requestPromotion(current.id, scope);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

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
