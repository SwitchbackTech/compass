import { CombinedLogin_Google } from "@core/types/auth.types";

// Map  user object given by google signin to our schema //
export namespace MapUser {
  export const toCompass = (userData: CombinedLogin_Google) => {
    return {
      email: userData.user.email,
      name: userData.user.name,
      picture: userData.user.picture,
      googleId: userData.user.id,
    };
  };
}
