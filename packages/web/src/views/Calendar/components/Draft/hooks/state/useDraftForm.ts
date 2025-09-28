import { OpenChangeReason } from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";
import { isSomedayEventActionMenuOpen } from "@web/common/utils/event/someday.event.util";
import { isContextMenuOpen } from "@web/common/utils/form/form.util";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

export const useDraftForm = (
  category: Categories_Event,
  isFormOpen: boolean,
  discard: () => void,
  reset: () => void,
  setIsFormOpen: (isOpen: boolean) => void,
) => {
  const handleDiscard = (reason?: OpenChangeReason) => {
    if (isContextMenuOpen() || isSomedayEventActionMenuOpen()) {
      // Prevent discard if context menu or someday action menu is open.
      // Discarding the event will mess with the context menu
      // logic flow because the context menu depends on having
      // a draft event selected.
      return;
    }

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
