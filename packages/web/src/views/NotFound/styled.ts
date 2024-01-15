import styled from "styled-components";
import { BASE_COLORS } from "@core/constants/colors";
export const StyledNotFoundImg = styled.img`
  border-radius: 50%;
  border: 4px solid #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  max-width: 100%;
`;

export const StyledNotFoundContainer = styled.div`
  align-items: center;
  background: ${BASE_COLORS.DEEP_BLUE};
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: center;
  width: 100vw;
`;

export const StyledBackButton = styled.button`
  background: ${BASE_COLORS.SLATE_GREY};
  border: 2px solid ${BASE_COLORS.SLATE_GREY};
  border-radius: 4px;
  color: ${BASE_COLORS.ONYX_GREY};
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px;
  margin-bottom: 20px;
  margin-top: 20px;
  transition: all 0.2s ease-in-out;

  &:hover {
    filter: brightness(120%);
  }
`;
