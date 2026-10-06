import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../http/json.ts';
import type { Logger } from '../logger.ts';
import type { ProductCatalog, Wait } from './catalogTypes.ts';
import { parseCategory } from './categoryParser.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

export interface CatalogControllerOptions {
  latencyMs: number;
  wait: Wait;
}

export class CatalogController {
  readonly #catalog: ProductCatalog;
  readonly #logger: Logger;
  readonly #options: CatalogControllerOptions;

  constructor(catalog: ProductCatalog, logger: Logger, options: CatalogControllerOptions) {
    this.#catalog = catalog;
    this.#logger = logger;
    this.#options = options;
  }

  async listProducts(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const category = parseCategory(new URL(request.url ?? '/', 'http://localhost').searchParams);
    await this.#options.wait(this.#options.latencyMs);
    const products = this.#catalog.listByCategory(category);
    this.#logger.info('catalog_served', { category, total: products.length });
    sendJson(response, 200, { category, total: products.length, products }, NO_STORE);
  }
}
