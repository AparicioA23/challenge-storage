import type { Credentials } from "../types/auth";

export const COOKIES_CONSENT_KEY = "cookiesConsent";
export const COOKIES_CONSENT_VALUE = "accepted";
export const COOKIES_CONSENT_EXPIRY_DAYS = 180;
export const AUTH_SESSION_COOKIE_KEY = "authSession";

export const CREDENTIAL_MAX_LENGTH = 128;
export const EMPTY_CREDENTIALS: Credentials = { username: "", password: "" };
