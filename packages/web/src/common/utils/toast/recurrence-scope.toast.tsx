import { type ReactNode } from "react";
import { type Id } from "react-toastify";
import {
  EVENT_DELETED_TOAST_ID,
  getToastDefaultOptions,
} from "@web/common/constants/toast.constants";
import { getToast } from "@web/common/utils/toast/toast.port";
import {
  type RecurrenceScopeOpportunity,
  recurrenceScopeOpportunityActions,
  useRecurrenceScopeOpportunityStore,
} from "@web/events/recurrence/recurrence-scope-opportunity.store";

export const RECURRENCE_SCOPE_TOAST_ID = "recurrence-scope-opportunity";

const actionClassName =
  "rounded px-1.5 py-0.5 text-sm font-medium text-text hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function ScopeToastContent({
  opportunity,
}: {
  opportunity: RecurrenceScopeOpportunity;
}) {
  const verb = opportunity.kind === "delete" ? "Deleted" : "Changed";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{verb} this event</span>
      <button
        type="button"
        className={actionClassName}
        onClick={() =>
          recurrenceScopeOpportunityActions.requestPromotion(
            opportunity.id,
            "thisAndFollowing",
          )
        }
      >
        <kbd>1</kbd> This &amp; following
      </button>
      <button
        type="button"
        className={actionClassName}
        onClick={() =>
          recurrenceScopeOpportunityActions.requestPromotion(
            opportunity.id,
            "all",
          )
        }
      >
        <kbd>2</kbd> All
      </button>
    </div>
  );
}

const toastIdFor = (opportunity: RecurrenceScopeOpportunity): Id =>
  opportunity.kind === "delete"
    ? EVENT_DELETED_TOAST_ID
    : RECURRENCE_SCOPE_TOAST_ID;

const show = (content: ReactNode, toastId: Id, onClose?: () => void) => {
  const toast = getToast();
  toast(content, {
    ...getToastDefaultOptions(),
    toastId,
    closeButton: false,
    closeOnClick: false,
    onClose,
  });
  toast.update(toastId, {
    render: content,
    autoClose: getToastDefaultOptions().autoClose,
    closeButton: false,
    closeOnClick: false,
    onClose,
  });
};

export function showRecurrenceScopeToast(
  opportunity: RecurrenceScopeOpportunity,
): void {
  show(
    <ScopeToastContent opportunity={opportunity} />,
    toastIdFor(opportunity),
    () => {
      recurrenceScopeOpportunityActions.dismiss(opportunity.id);
    },
  );
}

export function showRecurrenceScopePromotionToast(
  opportunity: RecurrenceScopeOpportunity,
): void {
  show("Applying change to the series…", toastIdFor(opportunity));
}

export function dismissRecurrenceScopeToast(opportunityId?: number): void {
  const opportunity = useRecurrenceScopeOpportunityStore.getState().opportunity;
  if (
    !opportunity ||
    (opportunityId !== undefined && opportunity.id !== opportunityId)
  ) {
    return;
  }

  getToast().dismiss(toastIdFor(opportunity));
}
