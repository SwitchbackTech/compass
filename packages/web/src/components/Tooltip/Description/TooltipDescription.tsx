import React, { FC } from "react";
import { Text } from "@web/components/Text";

interface Props {
  description: string;
}

export const TooltipDescription: FC<Props> = ({ description }) => {
  return (
    <Text size={11} style={{ paddingRight: 10 }}>
      {description}
    </Text>
  );
};
