import type React from "react";
import { type HTMLAttributes, useEffect, useState } from "react";
import { StyledDivider } from "./styled";
import { type Props } from "./types";

export const Divider: React.FC<Props & HTMLAttributes<HTMLDivElement>> = (
  props,
) => {
  const [toggled, toggle] = useState(false);

  useEffect(() => {
    toggle(true);
  }, []);

  return <StyledDivider toggled={toggled} {...props} />;
};
