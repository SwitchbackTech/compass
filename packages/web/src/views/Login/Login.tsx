import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';

import { Result_OauthStatus } from '@core/types/auth.types';
// import { store } from '@store';
// import { reducers } from '@store/reducers';
import { PriorityApi } from '@common/apis/priority.api';
import { AuthApi } from '@common/apis/auth.api';
import { SURVEY_URL } from '@compass/core/src/core.constants';
import { GOOGLE } from '@common/constants/common';
import { ROOT_ROUTES } from '@common/constants/routes';
import { Text } from '@components/Text';
import { ColorNames } from '@common/types/styles';
import { Button, FeedbackButtonContainer } from '@components/Button';

import { StyledLogin } from './styled';

export const LoginView = () => {
  const [redirect, setRedirect] = useState(false);

  async function refreshToken() {
    const refresh: { token: string } = await AuthApi.refresh();

    // Token has expired or invalid, user has to re-login //
    if (!refresh) {
      localStorage.setItem('token', '');
      localStorage.setItem('state', '');

      setRedirect(false);
    }

    localStorage.setItem('token', refresh.token);
    setRedirect(true);
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !redirect) {
      refreshToken();
    }
  }, [redirect]);

  const startGoogleOauth = async () => {
    const googleOauthData = await AuthApi.getOauthData(GOOGLE);
    localStorage.setItem('authState', googleOauthData.authState);
    window.open(googleOauthData.authUrl);

    // poll while user grants permissions
    let isOauthComplete = false;
    while (!isOauthComplete) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const status: Result_OauthStatus = await AuthApi.checkOauthStatus();
      isOauthComplete = status.isOauthComplete;

      if (isOauthComplete) {
        localStorage.setItem('token', status.token);
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
        console.log('auth complete. waiting and then syncing events ...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // todo move this stuff to onboard flow
        const prioritiesRes = await PriorityApi.createPriorities(status.token);
        console.log(prioritiesRes);

        setRedirect(true);
      }
    }
  };

  // const onboard = async (token: string) => {

  // }

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
