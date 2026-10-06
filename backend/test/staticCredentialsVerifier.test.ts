import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { StaticCredentialsVerifier } from '../src/auth/staticCredentialsVerifier.ts';

const verifier = new StaticCredentialsVerifier({ username: 'ana', password: 'S3cret!' });

describe('StaticCredentialsVerifier', () => {
  it('should accept the configured username and password', () => {
    // Arrange
    const credentials = { username: 'ana', password: 'S3cret!' };

    // Act
    const accepted = verifier.verify(credentials);

    // Assert
    assert.equal(accepted, true);
  });

  it('should reject a wrong password', () => {
    // Arrange
    const credentials = { username: 'ana', password: 's3cret!' };

    // Act
    const accepted = verifier.verify(credentials);

    // Assert
    assert.equal(accepted, false);
  });

  it('should reject an unknown username', () => {
    // Arrange
    const credentials = { username: 'bob', password: 'S3cret!' };

    // Act
    const accepted = verifier.verify(credentials);

    // Assert
    assert.equal(accepted, false);
  });
});
