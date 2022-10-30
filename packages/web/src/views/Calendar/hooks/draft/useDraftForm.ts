import { useRef, useState } from "react";
import { usePopper } from "react-popper";
import { ZIndex } from "@web/common/constants/web.constants";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { Categories_Event } from "@core/types/event.types";

export const useDraftForm = (
  category: Categories_Event,
  onClickOut: () => void
) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);

  const isSomeday = category === Categories_Event.SOMEDAY;
  const placement = isSomeday ? "right" : "auto-start";

  const { attributes, styles } = usePopper(referenceElement, popperElement, {
    placement,
    strategy: "fixed",
    modifiers: [
      {
        name: "flip",
        options: {
          fallbackPlacements: [
            "left-start",
            "left-end",
            "right-start",
            "right-end",
            "top",
            "bottom",
          ],
        },
      },
      {
        name: "offset",
        options: {
          offset: [0, 10],
        },
      },
    ],
  });

  const popperStyles = {
    ...styles.popper,
    zIndex: ZIndex.LAYER_3,
  };

  // useOnClickOutside(formRef, (e: MouseEvent) => {
  //   e.stopPropagation();
  //   e.preventDefault();

  //   // console.log("clicked out of form"); //++
  //   onClickOut();
  // });

  return {
    attributes,
    formRef,
    popperStyles,
    setPopperElement,
    setReferenceElement,
  };
};
