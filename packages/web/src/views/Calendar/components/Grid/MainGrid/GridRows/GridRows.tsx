import React from "react";
import { getHourLabels } from "@web/common/utils/web.date.util";

import { StyledGridRows, StyledGridRow } from "./styled";

export const GridRows = () => {
  return (
    <StyledGridRows>
      {getHourLabels().map((dayTime, index) => (
        <StyledGridRow key={`${dayTime}-${index}:dayTimes`} />
      ))}
    </StyledGridRows>
  );
};
