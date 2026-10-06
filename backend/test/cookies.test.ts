import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readCookie, serializeCookie } from '../src/http/cookies.ts';

describe('serializeCookie', () => {
  it('should omit HttpOnly and Secure when they are disabled', () => {
    // Arrange
    const attributes = { path: '/', maxAgeSeconds: 60, secure: false, httpOnly: false, sameSite: 'Lax' as const };

    // Act
    const cookie = serializeCookie('session', 'a b', attributes);

    // Assert
    assert.equal(cookie, 'session=a%20b; Path=/; Max-Age=60; SameSite=Lax');
  });
});

describe('readCookie', () => {
  it('should return the value of the requested cookie among several', () => {
    // Arrange
    const header = 'theme=dark; auth_token=a.b.c; lang=es';

    // Act
    const value = readCookie(header, 'auth_token');

    // Assert
    assert.equal(value, 'a.b.c');
  });

  it('should not match a cookie whose name only ends with the requested name', () => {
    // Arrange
    const header = 'other_auth_token=x.y.z';

    // Act
    const value = readCookie(header, 'auth_token');

    // Assert
    assert.equal(value, undefined);
  });

  it('should return undefined when there is no cookie header', () => {
    // Arrange
    const header = undefined;

    // Act
    const value = readCookie(header, 'auth_token');

    // Assert
    assert.equal(value, undefined);
  });
});
