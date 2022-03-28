import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { Result_OauthStatus } from "@core/types/auth.types";
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
  const [redirect, setRedirect] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  async function refreshToken() {
    const refresh: { token: string } = await AuthApi.refresh();

    // Token has expired or invalid, user has to re-login //
    if (!refresh) {
      localStorage.setItem(LocalStorage.TOKEN, "");
      localStorage.setItem(LocalStorage.STATE, "");

      setRedirect(false);
    }

    localStorage.setItem(LocalStorage.TOKEN, refresh.token);
    setRedirect(true);
  }

  const startGoogleOauth = async () => {
    setIsAuthenticating(true);
    const googleOauthData = await AuthApi.getOauthData(GOOGLE);
    localStorage.setItem(LocalStorage.AUTHSTATE, googleOauthData.authState);
    window.open(googleOauthData.authUrl);

    // poll while user grants permissions
    let isComplete = false;
    while (!isComplete) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const status: Result_OauthStatus = await AuthApi.checkOauthStatus();

      if (status.isOauthComplete) {
        localStorage.setItem(LocalStorage.TOKEN, status.token);
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
        If existing:
          - Send to calendar page, where you'll
            - fetching most-recent GCal events and sync with Compass
        */
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        // TODO move this stuff to onboard flow screen
        // const devTz = "America/Los_Angeles";
        // console.log(`\tsetting default TZ to: ${devTz}`);
        // localStorage.setItem(LocalStorage.TIMEZONE, devTz);

        await createPriorities(status.token);
        await createCalendarList();
        await importEvents();
        isComplete = true;
      }
    }
    setIsAuthenticating(false);
    setRedirect(true);
  };

  // User initialization stuff
  // TODO - add this to an onboarding flow
  const createCalendarList = async () => {
    console.log("creating calendarlist ...");
    const gcalList = await CalendarListApi.list();
    const ccalList = MapCalendarList.toCompass(gcalList);
    const res = await CalendarListApi.create(ccalList);
    console.log(res);
  };

  const createPriorities = async (token: string) => {
    console.log("creating priorities ...");
    const res = await PriorityApi.createPriorities(token);

    //TODO save to redux for future reference
    // move to a priority ducks dir
    console.log(res);
  };

  const importEvents = async () => {
    console.log("importing events ...");
    const res = await EventApi.import();
    console.log(res);
  };

  const Spinner = () => <h1>Loading ...</h1>;

  const MainPage = () => {
    return (
      <>
        {redirect ? (
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

  return <MainPage />;
};
