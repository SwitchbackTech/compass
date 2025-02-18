import { OpenChangeReason } from "@floating-ui/react";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

export const useDraftForm = (
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

  const formProps = useEventForm("grid", isFormOpen, onIsFormOpenChange);
  return formProps;
};
