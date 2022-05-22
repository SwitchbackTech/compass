import { ZIndex } from "@web/common/constants/web.constants";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { useRef, useState } from "react";
import { usePopper } from "react-popper";

export const useDraftForm = (onClickOut: () => void) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "auto",
    modifiers: [
      // {
      //   name: "preventOverflow",
      //   options: {
      //     altAxis: true,
      //     mainAxis: true,
      //   },
      // },
      {
        name: "flip",
        options: {
          fallbackPlacements: ["right", "left", "top", "bottom"],
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
    zIndex: ZIndex.LAYER_2,
  };

  useOnClickOutside(formRef, (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    console.log("on click out");
    onClickOut();
  });

  return {
    attributes,
    formRef,
    popperStyles,
    setPopperElement,
    setReferenceElement,
  };
};
