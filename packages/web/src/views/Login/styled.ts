import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

export const StyledLogin = styled(Flex)`
  background: ${getColor(ColorNames.BLUE_2)};
  bottom: 0;
  justify-content: center;
  left: 0;
  min-height: 100vh;
  position: fixed;
  right: 0;
  text-align: center;
  top: 0;
`;

export const Card = styled.div`
  background: #213c53;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  padding: 2rem;
`;

export const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

export const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${getColor(ColorNames.WHITE_5)};
  margin-bottom: 1rem;
`;

export const Description = styled.p`
  color: ${getColor(ColorNames.WHITE_4)};
  font-size: 1.25rem;
  margin-bottom: 2.25rem;
`;

export const Subtitle = styled.p`
  color: ${getColor(ColorNames.WHITE_5)};
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
`;

export const SignInButtonWrapper = styled.div`
  display: flex;
  background: #213c53;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2.625rem 1rem;
`;
