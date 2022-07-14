import React from "react";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { sagas } from "@web/store/sagas";
import { GlobalStyle } from "@web/components/GlobalStyle";

import { RootRouter } from "./routers";
import { store } from "./store";

export const isDev = () => process.env["NODE_ENV"] === "development";
const testClientId =
  "***REMOVED***";
const prodIdTemp =
  "***REMOVED***";
const clientId = isDev() ? testClientId : prodIdTemp;
console.log("using clientId for:", clientId === testClientId ? "TEST" : "PROD");

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <Provider store={store}>
          <GoogleOAuthProvider clientId={clientId}>
            <GlobalStyle />
            <RootRouter />
          </GoogleOAuthProvider>
        </Provider>
      </DndProvider>
    </React.StrictMode>
  );
};
