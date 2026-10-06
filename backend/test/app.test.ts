import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { AuthController } from '../src/auth/authController.ts';
import { AuthCookie } from '../src/auth/authCookie.ts';
import type { Authenticator, Credentials, LoginResult, TokenVerification } from '../src/auth/authTypes.ts';
import { CatalogController } from '../src/catalog/catalogController.ts';
import type { CatalogCategory, CatalogProduct, ProductCatalog } from '../src/catalog/catalogTypes.ts';
import { createRequestListener } from '../src/http/app.ts';
import type { Logger } from '../src/logger.ts';

const CORS_ORIGIN = 'http://localhost:3000';
const EXPIRES_AT = new Date('2026-01-01T12:05:00Z');

const authenticator = {
  login: mock.fn((_credentials: Credentials): LoginResult => ({ status: 'rejected' })),
  validate: mock.fn((_token: string): TokenVerification => ({ status: 'invalid' })),
} satisfies Authenticator;
const silentLogger: Logger = { info: mock.fn(), warn: mock.fn(), error: mock.fn() };
const CATALOG_LATENCY_MS = 750;
const BOOK: CatalogProduct = {
  id: 'books-1',
  sku: 'LIB-00001',
  name: 'Novela ilustrada 1',
  category: 'books',
  brand: 'Prisma',
  price: 45000,
  stock: 12,
  rating: 4.5,
  tags: ['ficción'],
  description: 'Novela ilustrada 1 de Prisma.',
  createdAt: '2024-03-01T00:00:00.000Z',
};
const catalog = {
  listByCategory: mock.fn((_category: CatalogCategory): CatalogProduct[] => [BOOK]),
} satisfies ProductCatalog;
const wait = mock.fn(async (_ms: number) => {});

interface ProblemBody {
  type: string;
  instance?: string;
  expiredAt?: string;
  errors: Array<{ field: string }>;
}

let server: Server;
let baseUrl: string;

function postLogin(body: string, contentType = 'application/json') {
  return fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
}

function getValidate(cookie?: string) {
  return fetch(`${baseUrl}/api/auth/validate`, { headers: cookie ? { Cookie: cookie } : {} });
}

async function readProblem(response: Response): Promise<ProblemBody> {
  return (await response.json()) as ProblemBody;
}

describe('HTTP API', () => {
  before(async () => {
    const authController = new AuthController(authenticator, new AuthCookie(true), silentLogger);
    const catalogController = new CatalogController(catalog, silentLogger, { latencyMs: CATALOG_LATENCY_MS, wait });
    server = createServer(
      createRequestListener({ authController, catalogController, logger: silentLogger, corsOrigin: CORS_ORIGIN })
    );
    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  );

  beforeEach(() => {
    authenticator.login.mock.resetCalls();
    authenticator.validate.mock.resetCalls();
    catalog.listByCategory.mock.resetCalls();
    wait.mock.resetCalls();
  });

  describe('POST /api/auth/login', () => {
    it('should set the token in an HttpOnly cookie without exposing it in the body', async () => {
      // Arrange
      authenticator.login.mock.mockImplementationOnce(() => ({
        status: 'authenticated',
        issuedToken: { token: 'a.b.c', expiresAt: EXPIRES_AT, expiresInSeconds: 300 },
      }));

      // Act
      const response = await postLogin(JSON.stringify({ username: 'ana', password: 'S3cret!' }));

      // Assert
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(
        response.headers.get('set-cookie'),
        'auth_token=a.b.c; Path=/api/auth; Max-Age=300; SameSite=Strict; HttpOnly; Secure'
      );
      assert.deepEqual(await response.json(), { expiresAt: EXPIRES_AT.toISOString(), expiresIn: 300 });
    });

    it('should answer 401 with Problem Details when the credentials are rejected', async () => {
      // Arrange
      const body = JSON.stringify({ username: 'ana', password: 'wrong' });

      // Act
      const response = await postLogin(body);

      // Assert
      assert.equal(response.status, 401);
      assert.match(response.headers.get('content-type') ?? '', /application\/problem\+json/);
      assert.equal((await readProblem(response)).type, '/problems/invalid-credentials');
    });

    it('should answer 400 listing the invalid fields without calling the authenticator', async () => {
      // Arrange
      const body = JSON.stringify({ username: '   ' });

      // Act
      const response = await postLogin(body);

      // Assert
      const problem = await readProblem(response);
      assert.equal(response.status, 400);
      assert.deepEqual(
        problem.errors.map((error) => error.field),
        ['username', 'password']
      );
      assert.equal(authenticator.login.mock.callCount(), 0);
    });

    it('should answer 400 when the body is not valid JSON', async () => {
      // Arrange
      const body = '{"username":';

      // Act
      const response = await postLogin(body);

      // Assert
      assert.equal(response.status, 400);
      assert.equal((await readProblem(response)).type, '/problems/malformed-json');
    });

    it('should answer 415 when the content type is not JSON', async () => {
      // Arrange
      const body = 'username=ana&password=S3cret!';

      // Act
      const response = await postLogin(body, 'application/x-www-form-urlencoded');

      // Assert
      assert.equal(response.status, 415);
    });

    it('should answer 413 when the body exceeds the size limit', async () => {
      // Arrange
      const body = JSON.stringify({ username: 'ana', password: 'x'.repeat(20 * 1024) });

      // Act
      const response = await postLogin(body);

      // Assert
      assert.equal(response.status, 413);
    });
  });

  describe('GET /api/auth/validate', () => {
    it('should confirm the token sent in the cookie with its subject and expiration', async () => {
      // Arrange
      authenticator.validate.mock.mockImplementationOnce(() => ({
        status: 'valid',
        claims: { sub: 'ana', iat: EXPIRES_AT.getTime() / 1000 - 300, exp: EXPIRES_AT.getTime() / 1000 },
      }));

      // Act
      const response = await getValidate('theme=dark; auth_token=a.b.c');

      // Assert
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { valid: true, subject: 'ana', expiresAt: EXPIRES_AT.toISOString() });
      assert.deepEqual(authenticator.validate.mock.calls[0].arguments, ['a.b.c']);
    });

    it('should answer 401 with the expiration date and clear the cookie when the token expired', async () => {
      // Arrange
      authenticator.validate.mock.mockImplementationOnce(() => ({ status: 'expired', expiredAt: EXPIRES_AT }));

      // Act
      const response = await getValidate('auth_token=a.b.c');

      // Assert
      const problem = await readProblem(response);
      assert.equal(response.status, 401);
      assert.equal(problem.type, '/problems/expired-token');
      assert.equal(problem.expiredAt, EXPIRES_AT.toISOString());
      assert.match(response.headers.get('set-cookie') ?? '', /^auth_token=; .*Max-Age=0/);
    });

    it('should answer 401 and clear the cookie when the token is invalid', async () => {
      // Arrange
      const cookie = 'auth_token=forged.token.value';

      // Act
      const response = await getValidate(cookie);

      // Assert
      assert.equal(response.status, 401);
      assert.equal((await readProblem(response)).type, '/problems/invalid-token');
      assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/);
    });

    it('should answer 401 without calling the authenticator when the token cookie is missing', async () => {
      // Arrange
      const cookie = 'theme=dark';

      // Act
      const response = await getValidate(cookie);

      // Assert
      assert.equal(response.status, 401);
      assert.equal((await readProblem(response)).type, '/problems/missing-token');
      assert.equal(authenticator.validate.mock.callCount(), 0);
    });
  });

  describe('GET /api/catalog/products', () => {
    it('should return the products of the requested category without letting the browser cache them', async () => {
      // Arrange
      const url = `${baseUrl}/api/catalog/products?category=books`;

      // Act
      const response = await fetch(url);

      // Assert
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('access-control-allow-origin'), CORS_ORIGIN);
      assert.deepEqual(await response.json(), { category: 'books', total: 1, products: [BOOK] });
      assert.deepEqual(catalog.listByCategory.mock.calls[0].arguments, ['books']);
    });

    it('should apply the configured latency before answering', async () => {
      // Arrange
      const url = `${baseUrl}/api/catalog/products?category=books`;

      // Act
      await fetch(url);

      // Assert
      assert.deepEqual(wait.mock.calls[0].arguments, [CATALOG_LATENCY_MS]);
    });

    it('should answer 400 when the category is not supported', async () => {
      // Arrange
      const url = `${baseUrl}/api/catalog/products?category=toys`;

      // Act
      const response = await fetch(url);

      // Assert
      const problem = await readProblem(response);
      assert.equal(response.status, 400);
      assert.equal(problem.type, '/problems/validation-error');
      assert.equal(problem.errors[0].field, 'category');
      assert.equal(catalog.listByCategory.mock.callCount(), 0);
    });

    it('should answer 400 when the category is missing', async () => {
      // Arrange
      const url = `${baseUrl}/api/catalog/products`;

      // Act
      const response = await fetch(url);

      // Assert
      assert.equal(response.status, 400);
      assert.equal(wait.mock.callCount(), 0);
    });
  });

  describe('routing and CORS', () => {
    it('should answer the CORS preflight allowing the origin to send credentials', async () => {
      // Arrange
      const request = { method: 'OPTIONS', headers: { Origin: CORS_ORIGIN, 'Access-Control-Request-Method': 'POST' } };

      // Act
      const response = await fetch(`${baseUrl}/api/auth/login`, request);

      // Assert
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), CORS_ORIGIN);
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    });

    it('should answer 405 with the allowed methods for a known path', async () => {
      // Arrange
      const url = `${baseUrl}/api/auth/login`;

      // Act
      const response = await fetch(url, { method: 'GET' });

      // Assert
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'POST');
    });

    it('should answer 404 for an unknown path', async () => {
      // Arrange
      const url = `${baseUrl}/api/unknown`;

      // Act
      const response = await fetch(url);

      // Assert
      assert.equal(response.status, 404);
      assert.equal((await readProblem(response)).instance, '/api/unknown');
    });
  });
});
