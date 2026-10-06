export interface Credentials {
  username: string;
  password: string;
}

export interface TokenClaims {
  sub: string;
  iat: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

export type TokenVerification =
  | { status: 'valid'; claims: TokenClaims }
  | { status: 'expired'; expiredAt: Date }
  | { status: 'invalid' };

export type LoginResult =
  | { status: 'authenticated'; issuedToken: IssuedToken }
  | { status: 'rejected' };

export type Clock = () => number;

export interface TokenService {
  issue(subject: string): IssuedToken;
  verify(token: string): TokenVerification;
}

export interface CredentialsVerifier {
  verify(credentials: Credentials): boolean;
}

export interface Authenticator {
  login(credentials: Credentials): LoginResult;
  validate(token: string): TokenVerification;
}
