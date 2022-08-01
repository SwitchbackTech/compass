import React, { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { AuthApi } from "@web/common/apis/auth.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ColorNames } from "@core/constants/colors";
import { Text } from "@web/components/Text";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import googleSignInBtn from "@web/assets/png/googleSignInBtn.png";

import { StyledLogin } from "./styled";

export const LoginView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const antiCsrfToken = useRef(self.crypto.randomUUID()).current;

  const SCOPES_REQUIRED = [
    "profile",
    "email",
    "https://www.googleapis.com/auth/calendar",
  ];

  const isMissingPermissions = (scope: string) => {
    const scopesGranted = scope.split(" ");

    return SCOPES_REQUIRED.some((s) => !scopesGranted.includes(s));
  };

  const login = useGoogleLogin({
    flow: "auth-code",
    scope: SCOPES_REQUIRED.join(" "),
    state: antiCsrfToken,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onSuccess: async ({ code, scope, state }) => {
      const isFromHacker = state !== antiCsrfToken;

      if (isFromHacker) {
        alert("Nice try, hacker");
        return;
      }
      if (isMissingPermissions(scope)) {
        alert("Missing permissions, please try again");
        return;
      }

      setIsAuthenticating(true);

      const { error } = await AuthApi.loginOrSignup(code);

      if (error) {
        alert(
          "An error occured on Compass' backend while logging you in. Please let Ty know"
        );
        console.log(error);
        setIsAuthenticating(false);
        return;
      }

      setIsAuthenticating(false);
      setIsAuthenticated(true);
    },
    onError: (error) => {
      alert(`Login failed because: ${error.error}`);
      console.log(error);
    },
  });

  return (
    <>
      {isAuthenticated ? (
        <Navigate to={ROOT_ROUTES.ROOT} />
      ) : (
        <StyledLogin
          alignItems={AlignItems.CENTER}
          direction={FlexDirections.COLUMN}
        >
          {isAuthenticating && <AbsoluteOverflowLoader />}
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

/* old success listener 

        // window.dispatchEvent(new Event(AUTH_SUCCESS));

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
*/

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
import { hasExpectedHeaders } from '../../../../backend/src/sync/services/sync.helpers';
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
