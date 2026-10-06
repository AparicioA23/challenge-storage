import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuthService } from '../src/auth/authService.ts';
import type { CredentialsVerifier, IssuedToken, TokenService, TokenVerification } from '../src/auth/authTypes.ts';

const ISSUED_TOKEN: IssuedToken = { token: 'signed.token.value', expiresAt: new Date('2026-01-01T12:05:00Z'), expiresInSeconds: 300 };
const CREDENTIALS = { username: 'ana', password: 'secret' };

function createDependencies(credentialsAreValid: boolean) {
  const credentialsVerifier: CredentialsVerifier = { verify: mock.fn(() => credentialsAreValid) };
  const tokenService = {
    issue: mock.fn((_subject: string) => ISSUED_TOKEN),
    verify: mock.fn((_token: string): TokenVerification => ({ status: 'invalid' })),
  } satisfies TokenService;
  return { credentialsVerifier, tokenService };
}

describe('AuthService', () => {
  it('should issue a token for the username when the credentials are valid', () => {
    // Arrange
    const { credentialsVerifier, tokenService } = createDependencies(true);
    const service = new AuthService(credentialsVerifier, tokenService);

    // Act
    const result = service.login(CREDENTIALS);

    // Assert
    assert.deepEqual(result, { status: 'authenticated', issuedToken: ISSUED_TOKEN });
    assert.deepEqual(tokenService.issue.mock.calls[0].arguments, ['ana']);
  });

  it('should reject the login without issuing a token when the credentials are invalid', () => {
    // Arrange
    const { credentialsVerifier, tokenService } = createDependencies(false);
    const service = new AuthService(credentialsVerifier, tokenService);

    // Act
    const result = service.login(CREDENTIALS);

    // Assert
    assert.deepEqual(result, { status: 'rejected' });
    assert.equal(tokenService.issue.mock.callCount(), 0);
  });

  it('should return the token verification produced by the token service', () => {
    // Arrange
    const { credentialsVerifier, tokenService } = createDependencies(true);
    const expired: TokenVerification = { status: 'expired', expiredAt: new Date('2026-01-01T12:05:00Z') };
    tokenService.verify.mock.mockImplementation(() => expired);
    const service = new AuthService(credentialsVerifier, tokenService);

    // Act
    const verification = service.validate('some.jwt.token');

    // Assert
    assert.deepEqual(verification, expired);
    assert.deepEqual(tokenService.verify.mock.calls[0].arguments, ['some.jwt.token']);
  });
});
