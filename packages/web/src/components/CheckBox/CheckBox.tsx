import React, { useEffect, useState } from "react";
import { CheckIcon } from "@web/assets/svg";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";

import { Styled, StyledPlaceholder } from "./styled";

export interface Props {
  isChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
  color?: string;
}

export const CheckBox: React.FC<Props> = ({
  isChecked,
  onChange,
  color = "black",
  ...props
}) => {
  const [isInternallyChecked, setIsChecked] = useState(isChecked);

  const onClick = () => {
    if (onChange) {
      onChange(!isInternallyChecked);
    }

    if (isChecked === undefined) {
      setIsChecked(!isInternallyChecked);
    }
  };

  useEffect(() => {
    setIsChecked(isChecked);
  }, [isChecked]);

  return (
    <Styled {...props} color={color} onClick={onClick}>
      {!isInternallyChecked ? (
        <StyledPlaceholder
          color={color}
          justifyContent={JustifyContent.CENTER}
          alignItems={AlignItems.CENTER}
          onClick={onClick}
        />
      ) : (
        <CheckIcon />
      )}
    </Styled>
  );
};
