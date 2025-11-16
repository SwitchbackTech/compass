import { HTMLProps, ReactNode } from "react";

interface Props extends HTMLProps<HTMLDivElement> {
  children?: ReactNode;
}

export const FormattedShortcutTip = ({
  children,
  className = "",
  ...props
}: Props) => {
  return (
    <div
      className={`border-bg-primary bg-color-fg-primary flex rounded border px-2.5 py-[5px] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
