import { ZIndex } from "@web/common/constants/web.constants";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { useRef, useState } from "react";
import { usePopper } from "react-popper";

export const useDraftForm = (onClickOut: () => void) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);

  //  | 'auto'
  // | 'auto-start'
  // | 'auto-end'
  // | 'top'
  // | 'top-start'
  // | 'top-end'
  // | 'bottom'
  // | 'bottom-start'
  // | 'bottom-end'
  // | 'right'
  // | 'right-start'
  // | 'right-end'
  // | 'left'
  // | 'left-start'
  // | 'left-end';
  const { attributes, styles } = usePopper(referenceElement, popperElement, {
    placement: "auto-start",
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
    zIndex: ZIndex.LAYER_2,
  };

  useOnClickOutside(formRef, (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

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
