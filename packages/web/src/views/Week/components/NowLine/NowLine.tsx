import type React from "react";
import { useEffect, useState } from "react";
import { getCurrentPercentOfDay } from "@web/common/utils/grid/grid.util";
import { StyledNowLine } from "./styled";

interface NowLineProps {
  width: number;
}

export const NowLine: React.FC<NowLineProps> = ({ width }) => {
  const [percentOfDay, setPercentOfDay] = useState(() =>
    getCurrentPercentOfDay(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPercentOfDay((current) => {
        if (window.__weekInteractionV2MotionActive) {
          return current;
        }

        const next = getCurrentPercentOfDay();
        return next === current ? current : next;
      });
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
