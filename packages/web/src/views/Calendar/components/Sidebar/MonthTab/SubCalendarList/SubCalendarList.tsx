import React, { FC } from "react";
import { theme } from "@web/common/styles/theme";
import { Divider } from "@web/components/Divider";
import { Text } from "@web/components/Text";
import {
  CalendarLabel,
  CalendarList,
  CalendarListContainer,
} from "../../styled";

export const SubCalendarList: FC = () => {
  return (
    <>
      <Divider
        role="separator"
        title="right sidebar divider"
        withAnimation={false}
      />
      <CalendarListContainer>
        <Text color={theme.color.text.light} size="xl">
          Calendars
        </Text>
        <CalendarList>
          <CalendarLabel>
            <input
              checked={true}
              disabled={true}
              type="checkbox"
              style={{ marginRight: "6px" }}
            />
            <Text color={theme.color.text.light} size="m">
              primary
            </Text>
          </CalendarLabel>
        </CalendarList>
      </CalendarListContainer>
    </>
  );
};
