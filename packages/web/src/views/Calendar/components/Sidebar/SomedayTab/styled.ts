import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";

export const SidebarContainer = styled.div`
  flex: 1;
`;

export const SidebarContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
`;

export const AddEventButton = styled(Text)`
  cursor: pointer;
  margin-right: 30px;
  &:hover {
    filter: brightness(160%);
    transition: filter 0.35s ease-out;
  }
`;

export const AddEventPlaceholder = styled.div`
  color: orange;
`;

export const SidebarHeader = styled(Flex)`
  margin: 10px 5px 20px 0px;
`;

export const SidebarSection = styled(Flex)`
  flex-direction: column;
`;

export const HeaderTitle = styled(Text)`
  margin: 0 10px;
`;

export const EventList = styled.div`
  padding: 20px;
  height: calc(100% - 67px);
`;
