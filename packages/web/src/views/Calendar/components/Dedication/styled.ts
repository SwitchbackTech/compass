import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";

export const modalStyles = {
  content: {
    background: theme.color.fg.primary,
    boxShadow: `0 4px 8px ${theme.color.panel.shadow}`,
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "59%",
    zIndex: ZIndex.MAX,
  },
};

export const StyledCaption = styled.div`
  color: transparent;
  font-size: 0.8rem;
  margin-left: 70px;
  padding-bottom: 30px;
`;

export const StyledDedicationModal = styled.div``;

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
  box-shadow: 0 0 10px ${({ theme }) => theme.color.panel.shadow};
  max-width: 100%;
`;

export const StyledDerekQuote = styled.blockquote`
  font-size: 1.5rem;
  font-style: italic;
  font-weight: bold;
  margin-right: 20px;
`;
