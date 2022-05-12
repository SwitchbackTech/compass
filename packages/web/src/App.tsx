import React from "react";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { sagas } from "@web/store/sagas";
import { GlobalStyle } from "@web/components/GlobalStyle";

import { RootRouter } from "./routers";
import { store } from "./store";

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <Provider store={store}>
          <GlobalStyle />
          <RootRouter />
        </Provider>
      </DndProvider>
    </React.StrictMode>
  );
};
