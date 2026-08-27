import { create } from "zustand";

export type BillingPreviewState = {
  /**
   * True while a gated user has chosen to look around the real calendar
   * instead of starting a trial right now.
   */
  isPreviewing: boolean;
};

export const initialBillingPreviewState: BillingPreviewState = {
  isPreviewing: false,
};

/**
 * Deliberately in-memory: a reload puts the trial ask back in front of the
 * user. Persisting it would turn a look-around into an indefinite bypass.
 */
export const useBillingPreviewStore = create<BillingPreviewState>()(() => ({
  ...initialBillingPreviewState,
}));

export const billingPreviewActions = {
  enter: () => {
    useBillingPreviewStore.setState({ isPreviewing: true });
  },
  /**
   * Bring the gate back. Called when a write is refused with
   * BILLING_REQUIRED: the look-around ends at the moment of real intent.
   */
  exit: () => {
    useBillingPreviewStore.setState({ isPreviewing: false });
  },
};

export const selectBillingPreviewing = (state: BillingPreviewState) =>
  state.isPreviewing;
