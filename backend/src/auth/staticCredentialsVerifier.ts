import { createHash, timingSafeEqual } from 'node:crypto';
import type { Credentials, CredentialsVerifier } from './authTypes.ts';

export class StaticCredentialsVerifier implements CredentialsVerifier {
  readonly #expected: Credentials;

  constructor(expected: Credentials) {
    this.#expected = expected;
  }

  verify(credentials: Credentials): boolean {
    const usernameMatches = constantTimeEquals(credentials.username, this.#expected.username);
    const passwordMatches = constantTimeEquals(credentials.password, this.#expected.password);
    return usernameMatches && passwordMatches;
  }
}

function constantTimeEquals(received: string, expected: string): boolean {
  return timingSafeEqual(sha256(received), sha256(expected));
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
