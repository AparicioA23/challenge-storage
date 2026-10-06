import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import type { AuthController } from '../auth/authController.ts';
import type { Logger } from '../logger.ts';
import { applyCorsHeaders } from './cors.ts';
import { sendProblem } from './json.ts';
import { HttpProblemError, problems } from './problems.ts';

type RouteHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void> | void;
type RouteTable = Record<string, Record<string, RouteHandler>>;

export interface AppDependencies {
  authController: AuthController;
  logger: Logger;
  corsOrigin: string;
}

export function createRequestListener({ authController, logger, corsOrigin }: AppDependencies): RequestListener {
  const routes: RouteTable = {
    '/api/auth/login': { POST: (request, response) => authController.login(request, response) },
    '/api/auth/validate': { GET: (request, response) => authController.validate(request, response) },
  };

  return async (request, response) => {
    const path = readPath(request);
    logRequestOnFinish(request, response, path, logger);
    applyCorsHeaders(response, corsOrigin);
    response.setHeader('X-Content-Type-Options', 'nosniff');

    try {
      await dispatch(routes, request, response, path);
    } catch (error) {
      handleError(error, response, path, logger);
    }
  };
}

async function dispatch(routes: RouteTable, request: IncomingMessage, response: ServerResponse, path: string) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  const handlersByMethod = routes[path];
  if (!handlersByMethod) {
    throw problems.notFound();
  }
  const handler = handlersByMethod[request.method ?? ''];
  if (!handler) {
    throw problems.methodNotAllowed(Object.keys(handlersByMethod));
  }
  await handler(request, response);
}

function handleError(error: unknown, response: ServerResponse, path: string, logger: Logger): void {
  const httpError = error instanceof HttpProblemError ? error : problems.internal();
  if (!(error instanceof HttpProblemError)) {
    logger.error('unhandled_error', { path, error: error instanceof Error ? error.message : String(error) });
  }
  if (response.headersSent) {
    response.end();
    return;
  }
  sendProblem(response, { ...httpError.problem, instance: path }, httpError.headers);
}

function logRequestOnFinish(request: IncomingMessage, response: ServerResponse, path: string, logger: Logger): void {
  const startedAt = performance.now();
  response.once('finish', () => {
    logger.info('http_request', {
      method: request.method,
      path,
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });
}

function readPath(request: IncomingMessage): string {
  return new URL(request.url ?? '/', 'http://localhost').pathname;
}
