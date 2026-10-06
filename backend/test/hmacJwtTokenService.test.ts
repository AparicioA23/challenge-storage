import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HmacJwtTokenService } from '../src/auth/hmacJwtTokenService.ts';

const SECRET = 'a-very-long-secret-used-only-for-tests-0123456789';
const TTL_SECONDS = 300;
const ISSUED_AT_MS = Date.UTC(2026, 0, 1, 12, 0, 0);

function createService(nowMs: () => number, secret = SECRET) {
  return new HmacJwtTokenService(secret, TTL_SECONDS, nowMs);
}

describe('HmacJwtTokenService', () => {
  it('should report a freshly issued token as valid with its subject', () => {
    // Arrange
    const service = createService(() => ISSUED_AT_MS);
    const { token } = service.issue('ana');

    // Act
    const verification = service.verify(token);

    // Assert
    assert.equal(verification.status, 'valid');
    assert.equal(verification.status === 'valid' && verification.claims.sub, 'ana');
  });

  it('should set the expiration date to the issue time plus the TTL', () => {
    // Arrange
    const service = createService(() => ISSUED_AT_MS);

    // Act
    const issued = service.issue('ana');

    // Assert
    assert.equal(issued.expiresAt.getTime(), ISSUED_AT_MS + TTL_SECONDS * 1000);
    assert.equal(issued.expiresInSeconds, TTL_SECONDS);
  });

  it('should report the token as expired once the TTL has elapsed', () => {
    // Arrange
    let nowMs = ISSUED_AT_MS;
    const service = createService(() => nowMs);
    const { token, expiresAt } = service.issue('ana');
    nowMs = ISSUED_AT_MS + TTL_SECONDS * 1000;

    // Act
    const verification = service.verify(token);

    // Assert
    assert.deepEqual(verification, { status: 'expired', expiredAt: expiresAt });
  });

  it('should still accept the token one second before it expires', () => {
    // Arrange
    let nowMs = ISSUED_AT_MS;
    const service = createService(() => nowMs);
    const { token } = service.issue('ana');
    nowMs = ISSUED_AT_MS + (TTL_SECONDS - 1) * 1000;

    // Act
    const verification = service.verify(token);

    // Assert
    assert.equal(verification.status, 'valid');
  });

  it('should reject a token whose payload was tampered with', () => {
    // Arrange
    const service = createService(() => ISSUED_AT_MS);
    const [header, , signature] = service.issue('ana').token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'admin', iat: 0, exp: 9_999_999_999 })).toString('base64url');

    // Act
    const verification = service.verify(`${header}.${forgedPayload}.${signature}`);

    // Assert
    assert.deepEqual(verification, { status: 'invalid' });
  });

  it('should reject a token signed with a different secret', () => {
    // Arrange
    const foreignService = createService(() => ISSUED_AT_MS, 'another-secret-with-more-than-32-characters!!');
    const { token } = foreignService.issue('ana');

    // Act
    const verification = createService(() => ISSUED_AT_MS).verify(token);

    // Assert
    assert.deepEqual(verification, { status: 'invalid' });
  });

  it('should reject an unsigned token that declares the "none" algorithm', () => {
    // Arrange
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'ana', iat: 0, exp: 9_999_999_999 })).toString('base64url');

    // Act
    const verification = createService(() => ISSUED_AT_MS).verify(`${header}.${payload}.`);

    // Assert
    assert.deepEqual(verification, { status: 'invalid' });
  });

  it('should reject a value that is not a three-segment token', () => {
    // Arrange
    const service = createService(() => ISSUED_AT_MS);

    // Act
    const verification = service.verify('not-a-token');

    // Assert
    assert.deepEqual(verification, { status: 'invalid' });
  });
});
