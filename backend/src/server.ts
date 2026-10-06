import { createServer, type Server } from 'node:http';
import { setTimeout as wait } from 'node:timers/promises';
import { AuthController } from './auth/authController.ts';
import { AuthCookie } from './auth/authCookie.ts';
import { AuthService } from './auth/authService.ts';
import { HmacJwtTokenService } from './auth/hmacJwtTokenService.ts';
import { StaticCredentialsVerifier } from './auth/staticCredentialsVerifier.ts';
import { CatalogController } from './catalog/catalogController.ts';
import { GeneratedProductCatalog } from './catalog/generatedProductCatalog.ts';
import { loadConfig, type AppConfig } from './config.ts';
import { createRequestListener } from './http/app.ts';
import { createJsonLogger, type Logger } from './logger.ts';

function buildServer(config: AppConfig, logger: Logger): Server {
  const tokenService = new HmacJwtTokenService(config.jwtSecret, config.tokenTtlSeconds);
  const authService = new AuthService(new StaticCredentialsVerifier(config.demoUser), tokenService);
  const authController = new AuthController(authService, new AuthCookie(config.cookieSecure), logger);
  const catalogController = new CatalogController(new GeneratedProductCatalog(config.catalogProductsPerCategory), logger, {
    latencyMs: config.catalogLatencyMs,
    wait: (ms) => wait(ms),
  });
  return createServer(
    createRequestListener({ authController, catalogController, logger, corsOrigin: config.corsOrigin })
  );
}

function registerGracefulShutdown(server: Server, logger: Logger): void {
  const shutdown = (signal: string) => {
    logger.info('server_stopping', { signal });
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function main(): void {
  const logger = createJsonLogger();
  try {
    const config = loadConfig(process.env);
    const server = buildServer(config, logger);
    registerGracefulShutdown(server, logger);
    server.listen(config.port, () => logger.info('server_started', { port: config.port, corsOrigin: config.corsOrigin }));
  } catch (error) {
    logger.error('server_start_failed', { error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  }
}

main();
