import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { SURVEY_URL } from "@core/core.constants";
import { PriorityApi } from "@web/common/apis/priority.api";
import { AuthApi } from "@web/common/apis/auth.api";
import { EventApi } from "@web/ducks/events/event.api";
import { CalendarListApi } from "@web/common/apis/calendarlist.api";
import { GOOGLE, LocalStorage } from "@web/common/constants/web.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ColorNames } from "@web/common/types/styles";
import { Text } from "@web/components/Text";
import { Button, FeedbackButtonContainer } from "@web/components/Button";

import { StyledLogin } from "./styled";

export const LoginView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const startGoogleOauth = async (createAccount: boolean) => {
    setIsAuthenticating(true);
    const { authState, authUrl } = await AuthApi.getOauthData(GOOGLE);
    window.open(authUrl);

    // poll while user grants permissions
    let isComplete = false;
    while (!isComplete) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const status = await AuthApi.checkOauthStatus(authState);

      if (status.isOauthComplete) {
        localStorage.setItem(LocalStorage.TOKEN, status.token);
        /*
        If new user:
          - send to onboarding screen where:
            - priorities created
            - primary calendar selected (not htis version) 
            - events fetched and imported
        If existing:
          - Send to calendar page, where you'll
            - fetching most-recent GCal events and sync with Compass
        */
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        /* 
        if !create account
          stop old watch
          start new (?)
        */

        if (createAccount) {
          await createPriorities(status.token);
          await createCalendarList();
          await importEvents();
          /*
          await setTimezone()...
            const devTz = "America/Los_Angeles";
            localStorage.setItem(LocalStorage.TIMEZONE, devTz);
          */
        }
        isComplete = true;
      }
    }

    setIsAuthenticating(false);
    setIsAuthenticated(true);
  };

  // User initialization stuff
  // TODO - add this to an onboarding flow
  const createCalendarList = async () => {
    console.log("creating calendarlist ...");
    const gcalList = await CalendarListApi.list();
    const ccalList = MapCalendarList.toCompass(gcalList);
    const res = await CalendarListApi.create(ccalList);
    // console.log(res);
  };

  const createPriorities = async (token: string) => {
    console.log("creating priorities ...");
    const res = await PriorityApi.createPriorities(token);

    //TODO save to redux for future reference
    // move to a priority ducks dir
    // console.log(res);
  };

  const importEvents = async () => {
    console.log("importing events ...");
    const res = await EventApi.import();
    // console.log(res);
  };

  const Spinner = () => <h1>Loading ...</h1>;

  const MainPage = () => {
    return (
      <>
        {isAuthenticated ? (
          <Navigate to={ROOT_ROUTES.ROOT} />
        ) : (
          <StyledLogin>
            {isAuthenticating && <Spinner />}
            <Text colorName={ColorNames.WHITE_2} size={30}>
              Connect your Google Calendar
            </Text>
            <p>
              <Text colorName={ColorNames.WHITE_3} size={15}>
                Compass syncs with your primary Google Calendar
              </Text>
            </p>
            <button type="button" onClick={() => startGoogleOauth(true)}>
              Sign up
            </button>
            <button type="button" onClick={() => startGoogleOauth(false)}>
              Sign in
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

  return <MainPage />;
};
