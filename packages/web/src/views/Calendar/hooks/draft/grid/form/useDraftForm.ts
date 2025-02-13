import { OpenChangeReason } from "@floating-ui/react";
import {
  selectIsDragging,
  selectIsResizing,
} from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

export const useDraftForm = (
  isFormOpen: boolean,
  reset: () => void,
  discard: () => void,
  setIsFormOpen: (isOpen: boolean) => void
) => {
  const dispatch = useAppDispatch();
  const isResizing = useAppSelector(selectIsResizing);
  const isDragging = useAppSelector(selectIsDragging);

  const handleDiscard = (reason?: OpenChangeReason) => {
    reset();

    if (reason === "escape-key") {
      discard();
      return;
    }

    if (reason === "outside-press") {
      discard();
      return;
    }

    // dont need to to this cuz
    // we are discarding in the mouse handler
    // } else if (reason === "outside-press") {
    // if (isResizing) {
    // dispatch(draftSlice.actions.resetActivity({}));
    // } else if (isDragging) {
    //todo do this discarding in mousehanlder
    // dispatch(draftSlice.actions.discard({}));
    // }
    //TODO handle swapping here
  };

  const onIsFormOpenChange = (isOpen: boolean, reason?: OpenChangeReason) => {
    const isFormAlreadyOpen = isFormOpen === true;
    if (isFormAlreadyOpen) {
      // console.log("discarding (local) draft cuz form already open");
      handleDiscard(reason);
      return;
    }

    setIsFormOpen(isOpen);

    if (isOpen === false) {
      console.log("resetting and discarding");
      reset();
      discard();
    }
  };
  const formProps = useEventForm("grid", isFormOpen, onIsFormOpenChange);
  return { formProps };
};
