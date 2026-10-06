import type { ServerResponse } from 'node:http';

const PREFLIGHT_MAX_AGE_SECONDS = 600;

export function applyCorsHeaders(response: ServerResponse, allowedOrigin: string): void {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Max-Age', String(PREFLIGHT_MAX_AGE_SECONDS));
  response.setHeader('Vary', 'Origin');
}
