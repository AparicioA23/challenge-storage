import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody, sendJson } from '../http/json.ts';
import { problems } from '../http/problems.ts';
import type { Logger } from '../logger.ts';
import type { AuthCookie } from './authCookie.ts';
import type { Authenticator, TokenVerification } from './authTypes.ts';
import { parseCredentials } from './credentialsParser.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

export class AuthController {
  readonly #authenticator: Authenticator;
  readonly #authCookie: AuthCookie;
  readonly #logger: Logger;

  constructor(authenticator: Authenticator, authCookie: AuthCookie, logger: Logger) {
    this.#authenticator = authenticator;
    this.#authCookie = authCookie;
    this.#logger = logger;
  }

  async login(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const credentials = parseCredentials(await readJsonBody(request));
    const result = this.#authenticator.login(credentials);
    if (result.status === 'rejected') {
      this.#logger.warn('login_rejected');
      throw problems.invalidCredentials();
    }

    const { token, expiresAt, expiresInSeconds } = result.issuedToken;
    sendJson(
      response,
      200,
      { expiresAt: expiresAt.toISOString(), expiresIn: expiresInSeconds },
      { ...NO_STORE, 'Set-Cookie': this.#authCookie.issue(token, expiresInSeconds) }
    );
  }

  validate(request: IncomingMessage, response: ServerResponse): void {
    const token = this.#authCookie.read(request.headers.cookie);
    if (!token) {
      throw problems.missingToken();
    }
    const verification = this.#authenticator.validate(token);
    if (verification.status !== 'valid') {
      response.setHeader('Set-Cookie', this.#authCookie.clear());
      throw toTokenProblem(verification);
    }

    const { sub, exp } = verification.claims;
    sendJson(response, 200, { valid: true, subject: sub, expiresAt: new Date(exp * 1000).toISOString() }, NO_STORE);
  }
}

function toTokenProblem(verification: Exclude<TokenVerification, { status: 'valid' }>) {
  return verification.status === 'expired' ? problems.expiredToken(verification.expiredAt) : problems.invalidToken();
}
