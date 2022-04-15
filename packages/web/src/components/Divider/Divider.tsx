import React, { HTMLAttributes, useEffect, useState } from "react";

import { Styled } from "./styled";
import { Props } from "./types";

export const Divider: React.FC<Props & HTMLAttributes<HTMLDivElement>> = (
  props
) => {
  const [toggled, toggle] = useState(false);

  useEffect(() => {
    // commented setTimeout because caused memory leak warning
    // setTimeout(() => {
    toggle(true);
    // });
  }, []);

  return <Styled toggled={toggled} {...props} />;
};
