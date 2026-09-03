import { create } from "zustand";

export type CheckoutPanelState = {
  isOpen: boolean;
};

export const initialCheckoutPanelState: CheckoutPanelState = {
  isOpen: false,
};

/** In-memory: a reload puts the trial ask back in front of the user. */
export const useCheckoutPanelStore = create<CheckoutPanelState>()(() => ({
  ...initialCheckoutPanelState,
}));

export const checkoutPanelActions = {
  open: () => {
    useCheckoutPanelStore.setState({ isOpen: true });
  },
  close: () => {
    useCheckoutPanelStore.setState({ isOpen: false });
  },
};

export const selectCheckoutPanelOpen = (state: CheckoutPanelState) =>
  state.isOpen;
