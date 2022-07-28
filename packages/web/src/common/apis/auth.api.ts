import { Result_Auth_Compass } from "@core/types/auth.types";

import { CompassApi } from "./compass.api";

const AuthApi = {
  async loginOrSignup(code: string) {
    const response = await CompassApi.post(`/oauth/google`, { code });
    console.log(response); //--
    return response.data as Result_Auth_Compass;
  },
  createSession: async () => await CompassApi.post(`/auth/session`),
  verifyTempShort: async () => await CompassApi.post(`/auth/verify-demo`),
};

export { AuthApi };

/*
verifyTemp: async () => { //works
  const response = await CompassApi.post(`/verify-demo`);
  return response;
},

<button onClick={async () => await createSessionTemp()}> 
<button onClick={async () => await AuthApi.verifyTemp()}> 
<button onClick={async () => await AuthApi.verifyTempShort()}> 

// reminder: use logout() if possible
// app.post(
//   "/api/auth/logout",
//   verifySession(),
//   async (req: SessionRequest, res) => {
//     // This will delete the session from the db and from the frontend (cookies)
//     const user = req.session?.getUserId();
//     await req.session!.revokeSession();

//     res.send(`Success! session revoked for ${user}`);
//   }
// );

*/
