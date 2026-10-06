export interface Credentials {
  username: string;
  password: string;
}

export interface AuthSession {
  expiresAt: Date;
}

export interface TokenValidation {
  subject: string;
  expiresAt: Date;
}

export type AuthErrorReason =
  | "invalid-credentials"
  | "invalid-request"
  | "missing-token"
  | "invalid-token"
  | "expired-token"
  | "network"
  | "unexpected-response";

export interface AuthApi {
  login(credentials: Credentials, signal?: AbortSignal): Promise<AuthSession>;
  validateToken(signal?: AbortSignal): Promise<TokenValidation>;
}

export type CookieSessionAction = "login" | "validate";

export interface CookieSessionFeedback {
  kind: "success" | "error";
  text: string;
}
