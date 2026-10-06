import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Clock, IssuedToken, TokenClaims, TokenService, TokenVerification } from './authTypes.ts';

const ENCODED_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const MILLISECONDS_PER_SECOND = 1000;

export class HmacJwtTokenService implements TokenService {
  readonly #secret: string;
  readonly #ttlSeconds: number;
  readonly #now: Clock;

  constructor(secret: string, ttlSeconds: number, now: Clock = Date.now) {
    this.#secret = secret;
    this.#ttlSeconds = ttlSeconds;
    this.#now = now;
  }

  issue(subject: string): IssuedToken {
    const issuedAt = this.#nowInSeconds();
    const claims: TokenClaims = { sub: subject, iat: issuedAt, exp: issuedAt + this.#ttlSeconds };
    const unsignedToken = `${ENCODED_HEADER}.${encodeClaims(claims)}`;

    return {
      token: `${unsignedToken}.${this.#sign(unsignedToken)}`,
      expiresAt: toDate(claims.exp),
      expiresInSeconds: this.#ttlSeconds,
    };
  }

  verify(token: string): TokenVerification {
    const claims = this.#readSignedClaims(token);
    if (claims === null) {
      return { status: 'invalid' };
    }
    if (claims.exp <= this.#nowInSeconds()) {
      return { status: 'expired', expiredAt: toDate(claims.exp) };
    }
    return { status: 'valid', claims };
  }

  #readSignedClaims(token: string): TokenClaims | null {
    const segments = token.split('.');
    if (segments.length !== 3) {
      return null;
    }
    const [header, payload, signature] = segments;
    if (header !== ENCODED_HEADER || !this.#hasValidSignature(`${header}.${payload}`, signature)) {
      return null;
    }
    return decodeClaims(payload);
  }

  #hasValidSignature(unsignedToken: string, signature: string): boolean {
    const expected = Buffer.from(this.#sign(unsignedToken));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  #sign(unsignedToken: string): string {
    return createHmac('sha256', this.#secret).update(unsignedToken).digest('base64url');
  }

  #nowInSeconds(): number {
    return Math.floor(this.#now() / MILLISECONDS_PER_SECOND);
  }
}

function encodeClaims(claims: TokenClaims): string {
  return Buffer.from(JSON.stringify(claims)).toString('base64url');
}

function decodeClaims(encodedClaims: string): TokenClaims | null {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'));
    return isTokenClaims(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function isTokenClaims(value: unknown): value is TokenClaims {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.sub === 'string' && Number.isInteger(candidate.iat) && Number.isInteger(candidate.exp);
}

function toDate(epochSeconds: number): Date {
  return new Date(epochSeconds * MILLISECONDS_PER_SECOND);
}
