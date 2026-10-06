import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigError, loadConfig } from '../src/config.ts';

const VALID_ENV = {
  JWT_SECRET: 'a-very-long-secret-used-only-for-tests-0123456789',
  DEMO_USERNAME: 'ana',
  DEMO_PASSWORD: 'S3cret!',
};

describe('loadConfig', () => {
  it('should apply defaults when optional variables are missing', () => {
    // Arrange
    const env = { ...VALID_ENV };

    // Act
    const config = loadConfig(env);

    // Assert
    assert.equal(config.port, 4000);
    assert.equal(config.tokenTtlSeconds, 300);
    assert.equal(config.corsOrigin, 'http://localhost:3000');
    assert.equal(config.cookieSecure, true);
    assert.deepEqual(config.demoUser, { username: 'ana', password: 'S3cret!' });
  });

  it('should fail when JWT_SECRET is missing', () => {
    // Arrange
    const env = { ...VALID_ENV, JWT_SECRET: undefined };

    // Act
    const load = () => loadConfig(env);

    // Assert
    assert.throws(load, ConfigError);
  });

  it('should fail when JWT_SECRET is shorter than 32 characters', () => {
    // Arrange
    const env = { ...VALID_ENV, JWT_SECRET: 'too-short' };

    // Act
    const load = () => loadConfig(env);

    // Assert
    assert.throws(load, /al menos 32 caracteres/);
  });

  it('should fail when TOKEN_TTL_SECONDS is not a positive integer', () => {
    // Arrange
    const env = { ...VALID_ENV, TOKEN_TTL_SECONDS: '-5' };

    // Act
    const load = () => loadConfig(env);

    // Assert
    assert.throws(load, /TOKEN_TTL_SECONDS/);
  });

  it('should fail when COOKIE_SECURE is not a boolean', () => {
    // Arrange
    const env = { ...VALID_ENV, COOKIE_SECURE: 'yes' };

    // Act
    const load = () => loadConfig(env);

    // Assert
    assert.throws(load, /COOKIE_SECURE/);
  });
});
