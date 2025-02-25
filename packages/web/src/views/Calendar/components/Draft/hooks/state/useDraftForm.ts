import { OpenChangeReason } from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

export const useDraftForm = (
  category: Categories_Event,
  isFormOpen: boolean,
  discard: () => void,
  reset: () => void,
  setIsFormOpen: (isOpen: boolean) => void,
) => {
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
  };

  const onIsFormOpenChange = (
    isOpen: boolean,
    e: Event,
    reason?: OpenChangeReason,
  ) => {
    const isFormAlreadyOpen = isFormOpen === true;
    if (isFormAlreadyOpen) {
      e.preventDefault(); // prevents form opening
      handleDiscard(reason);
      return;
    }

    setIsFormOpen(isOpen);

    if (isOpen === false) {
      reset();
      discard();
    }
  };

  const formProps = useEventForm(category, isFormOpen, onIsFormOpenChange);
  return formProps;
};

export type Props_DraftForm = ReturnType<typeof useDraftForm>;
