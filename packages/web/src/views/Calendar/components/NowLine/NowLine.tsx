import React, { useEffect, useState } from "react";
import { getCurrentPercentOfDay } from "@web/common/utils/grid.util";

import { StyledNowLine } from "./styled";

interface NowLineProps {
  width: number;
}

export const NowLine: React.FC<NowLineProps> = ({ width }) => {
  const [percentOfDay, setPercentOfDay] = useState(getCurrentPercentOfDay());

  useEffect(() => {
    const interval = setInterval(() => {
      setPercentOfDay(getCurrentPercentOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <StyledNowLine
      role="separator"
      title="now line"
      top={percentOfDay}
      width={width}
    />
  );
};
