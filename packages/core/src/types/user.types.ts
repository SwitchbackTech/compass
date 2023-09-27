export interface Schema_User {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: string;
  google: {
    googleId: string;
    picture: string;
    gRefreshToken: string;
  };
  signedUpAt?: Date;
  lastLoggedInAt?: Date;
}
