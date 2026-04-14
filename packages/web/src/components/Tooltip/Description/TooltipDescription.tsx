import { Text } from "@web/components/Text";
import { type FC } from "react";

interface Props {
  description: string;
}

export const TooltipDescription: FC<Props> = ({ description }) => {
  return (
    <Text size="m" style={{ paddingRight: 10 }}>
      {description}
    </Text>
  );
};
