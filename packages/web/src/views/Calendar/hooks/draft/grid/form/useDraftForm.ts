import { OpenChangeReason } from "@floating-ui/react";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

export const useDraftForm = (
  isFormOpen: boolean,
  reset: () => void,
  discard: () => void,
  setIsFormOpen: (isOpen: boolean) => void
) => {
  const onIsFormOpenChange = (isOpen: boolean, reason?: OpenChangeReason) => {
    const formAlreadyOpen = isFormOpen === true;

    if (formAlreadyOpen) {
      reset();

      // Not including click or outside press reasons
      // to avoid conflicting with custom mouse
      // handlers (useMouseHandlers.ts)
      if (reason === "escape-key") {
        discard();
      }
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
