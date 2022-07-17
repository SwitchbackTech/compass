import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  hasGrantedAllScopesGoogle,
  hasGrantedAnyScopeGoogle,
  useGoogleLogin,
} from "@react-oauth/google";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { PriorityApi } from "@web/common/apis/priority.api";
import { AuthApi } from "@web/common/apis/auth.api";
import { EventApi } from "@web/ducks/events/event.api";
import { CalendarListApi } from "@web/common/apis/calendarlist.api";
import { LocalStorage } from "@web/common/constants/web.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ColorNames } from "@core/constants/colors";
import { Text } from "@web/components/Text";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import googleSignInBtn from "@web/assets/png/googleSignInBtn.png";

import { StyledLogin } from "./styled";

const ACCESS_TOKEN_SUCCESS = "accessTokenSuccess";
// const ACCESS_TOKEN_ERROR = "accessTokenError";

export const LoginView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [isAuthenticating, setIsAuthenticating] = useState(false);

  const antiCsrfToken = useRef(self.crypto.randomUUID()).current;

  useEffect(() => {
    const successListener = () => {
      setIsAuthenticated(true);
    };
    // const errorListener = () => {
    // setIsAuthenticating(false);
    // };

    window.addEventListener(ACCESS_TOKEN_SUCCESS, successListener);
    // window.addEventListener(ACCESS_TOKEN_ERROR, errorListener);

    return () => {
      console.log("removing listeners...");
      window.removeEventListener(ACCESS_TOKEN_SUCCESS, successListener);
      // window.removeEventListener(ACCESS_TOKEN_ERROR, errorListener);
    };
  }, []);

  const login = useGoogleLogin({
    flow: "auth-code",
    state: antiCsrfToken,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onSuccess: async ({ code, state }) => {
      const isFromHacker = state !== antiCsrfToken;

      if (isFromHacker) {
        alert("Nice try, hacker");
        // window.dispatchEvent(new Event(ACCESS_TOKEN_ERROR));
        return;
      }

      const { error, accessToken } = await AuthApi.loginOrSignup(code);

      if (error) {
        alert("Something went wrong on Compass' backend during login/signup");
        console.log(error);
        return;
      }

      localStorage.setItem(LocalStorage.ACCESS_TOKEN, accessToken);
      window.dispatchEvent(new Event(ACCESS_TOKEN_SUCCESS));
    },
    onError: (error) => {
      alert("Something went wrong during Google Oauth");
      console.log(error);
    },
  });

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
    console.log(res); //++
  };

  return (
    <>
      {isAuthenticated ? (
        // <Navigate to={ROOT_ROUTES.ROOT} />
        <h1>TODO: Navigate to caledar ...</h1>
      ) : (
        <StyledLogin
          alignItems={AlignItems.CENTER}
          direction={FlexDirections.COLUMN}
        >
          {/* {isAuthenticating && <AbsoluteOverflowLoader />} */}
          <Text colorName={ColorNames.WHITE_2} size={30}>
            Connect your Google Calendar
          </Text>
          <p>
            <Text colorName={ColorNames.WHITE_3} size={15}>
              Compass syncs with your primary Google Calendar
            </Text>
          </p>

          <div
            onClick={() => {
              // setIsAuthenticating(true);
              login();
            }}
          >
            <img src={googleSignInBtn} alt="Sign In With Google" />
          </div>
        </StyledLogin>
      )}
    </>
  );
};

/* old stuff - remove once done 
  const startGoogleOauth = async (createAccount: boolean) => {
    setIsAuthenticating(true);
    const { authState, authUrl } = await AuthApi.getOauthData(GOOGLE);
    window.open(authUrl);

    let isComplete = false;
    let statusChecks = 0;

    while (!isComplete && statusChecks < 15) {
      // limiting attempts prevents endless requests upon issue/delay
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const status = await AuthApi.checkOauthStatus(authState);
      statusChecks += 1;

      if (status.isOauthComplete) {
        localStorage.setItem(LocalStorage.TOKEN, status.token);
        
        // If new user:
        //   - send to onboarding screen where:
        //     - priorities created
        //     - primary calendar selected (not htis version) 
        //     - events fetched and imported
        // If existing:
        //   - Send to calendar page, where you'll
        //     - fetching most-recent GCal events and sync with Compass
        

        if (createAccount) {
          await createPriorities(status.token);
          await createCalendarList();
          await importEvents();

          await setTimezone()...
            const devTz = "America/Los_Angeles";
            localStorage.setItem(LocalStorage.TIMEZONE, devTz); // migrate to DB instead
          }
          isComplete = true;
        }
      }
      
      setIsAuthenticating(false);
      isComplete
      ? setIsAuthenticated(true)
      : alert("That took a little too long. Please try again");
    };
    */

/* feedback btn
import { Button, FeedbackButtonContainer } from "@web/components/Button";
              <FeedbackButtonContainer>
              <Button
                color={ColorNames.DARK_5}
                onClick={() => window.open(SURVEY_URL)}
              >
                Send feedback
              </Button>
            </FeedbackButtonContainer>

  
  */

/* google btns 
                      <div
            id="g_id_onload"
            data-client_id="***REMOVED***"
            data-context="use"
            data-ux_mode="popup"
            data-callback={login}
            data-auto_prompt="false"
          ></div>

          <div
            class="g_id_signin"
            data-type="standard"
            data-shape="rectangular"
            data-theme="outline"
            data-text="continue_with"
            data-size="large"
            data-logo_alignment="left"
          ></div>
            
            */

/* google btn 2 
          <div
            id="g_id_onload"
            // data-client_id="***REMOVED***"
            data-context="use"
            // data-ux_mode="popup"
            // data-login_uri="http://localhost:9080"
            data-auto_prompt="false"
          ></div>

          <div
            class="g_id_signin"
            data-type="standard"
            data-shape="pill"
            data-theme="outline"
            data-text="continue_with"
            data-size="large"
            data-logo_alignment="left"
          ></div>


*/

/* scopes 

      //need to get scopes from backend, not frontend

      // "profile", //add others
      // "email"
      // const hasAccess = hasGrantedAllScopesGoogle(
      //   response,
      //   "profile",
      //   "email",
      //   "https://www.googleapis.com/auth/calendar"
      // );
      // if (!hasAccess) {
      //   alert(
      //     "Oops, we need more Google permissions in order to work. Please try again"
      //   );
      //   setIsAuthenticating(false);
      //   return;
      // }

*/

/* the other promise way 
    // onSuccess: ({ code }) => {
    //   AuthApi.exchangeCodeForToken(code)
    //     .then(({ token }) => {
    //       console.log("token:", token);
    //     })
    //     .catch((e) => console.log(e))
    //     .finally(() => setIsAuthenticated(false));
    // },



*/
