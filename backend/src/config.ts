import type { Credentials } from './auth/authTypes.ts';

export interface AppConfig {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  tokenTtlSeconds: number;
  cookieSecure: boolean;
  demoUser: Credentials;
  catalogLatencyMs: number;
  catalogProductsPerCategory: number;
}

type Environment = Record<string, string | undefined>;

const MIN_SECRET_LENGTH = 32;
const DEFAULT_PORT = 4000;
const DEFAULT_TOKEN_TTL_SECONDS = 300;
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const DEFAULT_CATALOG_LATENCY_MS = 1000;
const DEFAULT_CATALOG_PRODUCTS_PER_CATEGORY = 1000;

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
    catalogLatencyMs: readNonNegativeInteger(env, 'CATALOG_LATENCY_MS', DEFAULT_CATALOG_LATENCY_MS),
    catalogProductsPerCategory: readPositiveInteger(
      env,
      'CATALOG_PRODUCTS_PER_CATEGORY',
      DEFAULT_CATALOG_PRODUCTS_PER_CATEGORY
    ),
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
  return readInteger(env, name, fallback, 1, 'un entero positivo');
}

function readNonNegativeInteger(env: Environment, name: string, fallback: number): number {
  return readInteger(env, name, fallback, 0, 'un entero mayor o igual a 0');
}

function readInteger(env: Environment, name: string, fallback: number, min: number, expectation: string): number {
  const rawValue = env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < min) {
    throw new ConfigError(`${name} debe ser ${expectation}.`);
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
