import React, { useState, useEffect } from "react";
import { Redirect } from "react-router-dom";

import { Result_OauthStatus } from "@core/types/auth.types";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { SURVEY_URL } from "@core/core.constants";

// import { store } from '@web/store';
// import { reducers } from '@web/store/reducers';
import { PriorityApi } from "@web/common/apis/priority.api";
import { AuthApi } from "@web/common/apis/auth.api";
import { EventApi } from "@web/ducks/events/api";
import { CalendarListApi } from "@web/common/apis/calendarlist.api";
import { GOOGLE } from "@web/common/constants/common";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ColorNames } from "@web/common/types/styles";
import { Text } from "@web/components/Text";
import { Button, FeedbackButtonContainer } from "@web/components/Button";

import { StyledLogin } from "./styled";

export const LoginView = () => {
  const [redirect, setRedirect] = useState(false);

  async function refreshToken() {
    const refresh: { token: string } = await AuthApi.refresh();

    // Token has expired or invalid, user has to re-login //
    if (!refresh) {
      localStorage.setItem("token", "");
      localStorage.setItem("state", "");

      setRedirect(false);
    }

    localStorage.setItem("token", refresh.token);
    setRedirect(true);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !redirect) {
      refreshToken();
    }
  }, [redirect]);

  const startGoogleOauth = async () => {
    const googleOauthData = await AuthApi.getOauthData(GOOGLE);
    localStorage.setItem("authState", googleOauthData.authState);
    window.open(googleOauthData.authUrl);

    // poll while user grants permissions
    let isOauthComplete = false;
    while (!isOauthComplete) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const status: Result_OauthStatus = await AuthApi.checkOauthStatus();
      isOauthComplete = status.isOauthComplete;

      if (isOauthComplete) {
        localStorage.setItem("token", status.token);
        //throws error if token has expired or has a invalid signature
        /*
        OR NOT, cuz user would only go through the oauth init flow 
        the first time, and their token would be refreshed after that.
        so just always send them to the onboarding screen?

        If new user:
          - send to onboarding screen where:
            - priorities created
            - primary calendar selected (not htis version) 
            - events fetched and imported
        If existing:import { Schema_Calendar } from '@core/types/calendar.types';
import { gSchema$CalendarList } from '@backend/declarations';

          - Send to calendar page, where you'll
            - fetching most-recent GCal events and sync with Compass
        */
        console.log("auth complete. initing data ...");
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        // todo move this stuff to onboard flow
        await createPriorities(status.token);
        await createCalendarList();
        await importEvents();
        // setRedirect(true);
      }
    }
  };

  // User initialization stuff
  // TODO - add this to an onboarding flow
  const createCalendarList = async () => {
    const gcalList = await CalendarListApi.list();
    const ccalList = MapCalendarList.toCompass(gcalList);
    const res = await CalendarListApi.create(ccalList);
  };

  const createPriorities = async (token: string) => {
    console.log("creating priorities ...");
    const res = await PriorityApi.createPriorities(token);
    console.log(res);
  };

  const importEvents = async () => {
    console.log("importing events ...");
    const res = await EventApi.import();
    console.log(res);
  };

  return (
    <>
      {redirect ? (
        <Redirect to={ROOT_ROUTES.ROOT} />
      ) : (
        <StyledLogin>
          <Text colorName={ColorNames.WHITE_2} size={30}>
            Connect your Google Calendar
          </Text>
          <p>
            <Text colorName={ColorNames.WHITE_3} size={15}>
              Compass syncs with your primary Google Calendar
            </Text>
          </p>
          <button type="button" onClick={startGoogleOauth}>
            Connect My Google Calendar
          </button>

          <FeedbackButtonContainer>
            <Button
              color={ColorNames.DARK_5}
              onClick={() => window.open(SURVEY_URL)}
            >
              Send feedback
            </Button>
          </FeedbackButtonContainer>
        </StyledLogin>
      )}
    </>
  );
};
