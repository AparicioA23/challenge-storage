import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import { problems, type ProblemDetails } from './problems.ts';

const DEFAULT_MAX_BODY_BYTES = 10 * 1024;
const JSON_MEDIA_TYPE = 'application/json';

export async function readJsonBody(request: IncomingMessage, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<unknown> {
  assertJsonContentType(request.headers['content-type']);
  const rawBody = await readRawBody(request, maxBytes);
  return parseJson(rawBody);
}

export function sendJson(response: ServerResponse, status: number, body: unknown, headers: OutgoingHttpHeaders = {}): void {
  response.writeHead(status, { 'Content-Type': `${JSON_MEDIA_TYPE}; charset=utf-8`, ...headers });
  response.end(JSON.stringify(body));
}

export function sendProblem(response: ServerResponse, problem: ProblemDetails, headers: OutgoingHttpHeaders = {}): void {
  response.writeHead(problem.status, { 'Content-Type': 'application/problem+json; charset=utf-8', ...headers });
  response.end(JSON.stringify(problem));
}

function assertJsonContentType(contentType: string | undefined): void {
  const mediaType = contentType?.split(';')[0].trim().toLowerCase();
  if (mediaType !== JSON_MEDIA_TYPE) {
    throw problems.unsupportedMediaType();
  }
}

async function readRawBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    receivedBytes += (chunk as Buffer).length;
    if (receivedBytes > maxBytes) {
      throw problems.payloadTooLarge(maxBytes);
    }
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw problems.malformedJson();
  }
}
