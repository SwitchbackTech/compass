import { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents } from "@core/types/websocket.types";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { useUser } from "@web/auth/UserContext";
import { ENV_WEB } from "@web/common/constants/env.constants";

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { userId } = useUser();

  /* socket */
  // useEffect(() => {
  //   //TODO move this out of effect?
  //   socket.on("eventChanged", (data) => {
  //     console.log("event change [TODO: dispatch]", data);
  //   });

  //   return () => {
  //     socket.off("eventChanged");
  //   };
  // }, [dispatch, socket]);
  const socket: Socket<ServerToClientEvents> = io(ENV_WEB.BACKEND_BASEURL, {
    withCredentials: true,
    query: {
      userId,
    },
  });

  socket.on("connect", () => {
    console.log("connected to server!");
    console.log(socket);
  });

  //TODO move this out of the provder and into an actions handler (?)
  socket.on(EVENT_CHANGED, (data) => {
    console.log("event change [TODO: dispatch]", data);
    // next steps:
    //  - log to console
    //  - check if event change is relevant for the week in view
    //  - check if it's not already present (eg if change originally came from Compass)
    //  - if still relevant, add new console log
    //  - then render refresh button with tooltip explaining
    //    that the event data is stale
    //  - on click, refetch the events
    //    - ideally you can just dispatch the event so the whole page
    //      doesnt need to be re-rendered
    //      as backup, can run window.reload
  });

  return children;
};

export default SocketProvider;
