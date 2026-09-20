/** A user is just a name and the bearer token that identifies them. */
export interface User {
  name: string;
  token: string;
}

/** The identity resolved from a token, used for authorization decisions. */
export interface AuthenticatedUser {
  name: string;
  isAdmin: boolean;
}
