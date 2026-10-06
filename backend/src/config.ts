import type { Credentials } from './auth/authTypes.ts';

export interface AppConfig {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  tokenTtlSeconds: number;
  cookieSecure: boolean;
  demoUser: Credentials;
}

type Environment = Record<string, string | undefined>;

const MIN_SECRET_LENGTH = 32;
const DEFAULT_PORT = 4000;
const DEFAULT_TOKEN_TTL_SECONDS = 300;
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: Environment): AppConfig {
  return {
    port: readPositiveInteger(env, 'PORT', DEFAULT_PORT),
    corsOrigin: env.CORS_ORIGIN?.trim() || DEFAULT_CORS_ORIGIN,
    jwtSecret: readSecret(env),
    tokenTtlSeconds: readPositiveInteger(env, 'TOKEN_TTL_SECONDS', DEFAULT_TOKEN_TTL_SECONDS),
    cookieSecure: readBoolean(env, 'COOKIE_SECURE', true),
    demoUser: { username: readRequired(env, 'DEMO_USERNAME'), password: readRequired(env, 'DEMO_PASSWORD') },
  };
}

function readRequired(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new ConfigError(`La variable de entorno ${name} es obligatoria.`);
  }
  return value;
}

function readSecret(env: Environment): string {
  const secret = readRequired(env, 'JWT_SECRET');
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(`JWT_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
  }
  return secret;
}

function readPositiveInteger(env: Environment, name: string, fallback: number): number {
  const rawValue = env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(`${name} debe ser un entero positivo.`);
  }
  return value;
}

function readBoolean(env: Environment, name: string, fallback: boolean): boolean {
  const rawValue = env[name]?.trim().toLowerCase();
  if (!rawValue) {
    return fallback;
  }
  if (rawValue !== 'true' && rawValue !== 'false') {
    throw new ConfigError(`${name} debe ser true o false.`);
  }
  return rawValue === 'true';
}
