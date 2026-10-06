import { readCookie, serializeCookie, type CookieAttributes } from '../http/cookies.ts';

export const AUTH_COOKIE_NAME = 'auth_token';

export class AuthCookie {
  readonly #attributes: Omit<CookieAttributes, 'maxAgeSeconds'>;

  constructor(secure: boolean) {
    this.#attributes = { path: '/api/auth', secure, httpOnly: true, sameSite: 'Strict' };
  }

  issue(token: string, maxAgeSeconds: number): string {
    return serializeCookie(AUTH_COOKIE_NAME, token, { ...this.#attributes, maxAgeSeconds });
  }

  clear(): string {
    return serializeCookie(AUTH_COOKIE_NAME, '', { ...this.#attributes, maxAgeSeconds: 0 });
  }

  read(cookieHeader: string | undefined): string | undefined {
    return readCookie(cookieHeader, AUTH_COOKIE_NAME) || undefined;
  }
}
