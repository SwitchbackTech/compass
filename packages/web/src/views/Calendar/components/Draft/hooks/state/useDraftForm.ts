import { OpenChangeReason } from "@floating-ui/react";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

export const useDraftForm = (
  isFormOpen: boolean,
  discard: () => void,
  reset: () => void,
  setIsFormOpen: (isOpen: boolean) => void,
) => {
  const handleDiscard = (reason?: OpenChangeReason) => {
    console.log("resetting...");
    reset();

    if (reason === "escape-key") {
      console.log("discarding draft cuz escape key was pressed");
      discard();
      return;
    }

    if (reason === "outside-press") {
      console.log("discarding draft cuz outside press");
      discard();
      return;
    }
  };

  const onIsFormOpenChange = (
    isOpen: boolean,
    event,
    reason?: OpenChangeReason,
  ) => {
    const isFormAlreadyOpen = isFormOpen === true;
    if (isFormAlreadyOpen) {
      handleDiscard(reason);
      return;
    }

    console.log("setting isFormOpen to", isOpen);
    setIsFormOpen(isOpen);

    if (isOpen === false) {
      console.log("resetting and discarding");
      reset();
      discard();
    }
  };

  const formProps = useEventForm("grid", isFormOpen, onIsFormOpenChange);
  return formProps;
};
