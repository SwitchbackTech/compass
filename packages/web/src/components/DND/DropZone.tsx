import classNames from "classnames";
import { type HTMLAttributes, type Ref } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  innerRef?: Ref<HTMLDivElement>;
  isActive: boolean;
}

export const DropZone = ({
  className,
  innerRef,
  isActive,
  ...props
}: Props) => {
  return (
    <div
      {...props}
      className={classNames(
        "relative rounded-default border-2 border-dashed transition-[background-color,border-color] duration-200",
        isActive
          ? "border-border-primary bg-bg-secondary"
          : "border-transparent bg-transparent",
        className,
      )}
      ref={innerRef}
    />
  );
};
