import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents } from "@core/types/websocket.types";
import { getUserId } from "@web/auth/auth.util";

//TODO Move this to loading above the calendar
// to reduce re-rendering
const useSocketEventListener = () => {
  const [userId, setUserId] = useState<null | string>(null);

  useEffect(() => {
    const fetchData = async () => {
      const uid = await getUserId();
      setUserId(uid);
    };

    void fetchData();
  }, []);

  // useEffect(() => {
  //   //TODO move this out of effect?
  //   socket.on("eventChanged", (data) => {
  //     console.log("event change [TODO: dispatch]", data);
  //   });

  //   return () => {
  //     socket.off("eventChanged");
  //   };
  // }, [dispatch, socket]);

  if (!userId) {
    console.log("skipping, cuz no uid");
    return;
  }

  console.log("setting socket with uid:", userId);
  const socket: Socket<ServerToClientEvents> = io("http://localhost:3000", {
    withCredentials: true,
    query: {
      userId,
    },
  });
  console.log("setup socket");

  socket.on("connect", () => {
    console.log("connected to server!");
    console.log(socket);
  });
};

export default useSocketEventListener;
