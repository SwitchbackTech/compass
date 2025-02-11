import { OpenChangeReason } from "@floating-ui/react";
import { selectIsResizing } from "@web/ducks/events/selectors/draft.selectors";
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

  const handleDiscard = (reason?: OpenChangeReason) => {
    reset();

    if (reason === "escape-key") {
      discard();
    } else if (reason === "outside-press") {
      if (isResizing) {
        //TODO: maybe move this up to mouse handlers
        // so its in the same spot as drag handler
        dispatch(draftSlice.actions.resetActivity({}));
      }
    }
  };

  const onIsFormOpenChange = (isOpen: boolean, reason?: OpenChangeReason) => {
    const isFormAlreadyOpen = isFormOpen === true;
    if (isFormAlreadyOpen) {
      handleDiscard(reason);
      return;
    }

    setIsFormOpen(isOpen);

    if (isOpen === false) {
      reset();
      discard();
    }
  };
  const formProps = useEventForm("grid", isFormOpen, onIsFormOpenChange);
  return { formProps };
};
