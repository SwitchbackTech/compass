import styled from "styled-components";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { Flex } from "@web/components/Flex";

export const modalStyles = {
  content: {
    background: getColor(ColorNames.WHITE_1),
    border: `1px solid ${getColor(ColorNames.GREY_3)}`,
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "59%",
    zIndex: 1000,
  },
};

export const StyledCaption = styled.div`
  color: #545050;
  font-size: 0.8rem;
  margin-left: 70px;
  padding-bottom: 30px;
`;

export const StyledDedicationModal = styled.div`
  background-color: ${getColor(ColorNames.WHITE_1)};

  &.ReactModal__Content--after-open {
    background-color: pink;
  }
`;

export const StyledDedicationText = styled.p`
  font-size: 1rem;
`;

export const StyledDerekQuoteContainer = styled(Flex)`
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

export const StyledDerekPic = styled.img`
  border-radius: 50%;
  border: 4px solid #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  max-width: 100%;
`;

export const StyledDerekQuote = styled.blockquote`
  font-size: 1.5rem;
  font-style: italic;
  font-weight: bold;
  margin-right: 20px;
`;
