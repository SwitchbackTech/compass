import { type FC } from "react";
import { Text } from "@web/components/Text/Text";

interface Props {
  description: string;
}

export const TooltipDescription: FC<Props> = ({ description }) => {
  return <Text style={{ paddingRight: 10 }}>{description}</Text>;
};
