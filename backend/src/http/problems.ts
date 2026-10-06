import type { OutgoingHttpHeaders } from 'node:http';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [extension: string]: unknown;
}

export interface FieldError {
  field: string;
  message: string;
}

export class HttpProblemError extends Error {
  readonly problem: ProblemDetails;
  readonly headers: OutgoingHttpHeaders;

  constructor(problem: ProblemDetails, headers: OutgoingHttpHeaders = {}) {
    super(problem.detail);
    this.name = 'HttpProblemError';
    this.problem = problem;
    this.headers = headers;
  }
}

const PROBLEM_TYPE_BASE = '/problems';

function problem(slug: string, status: number, title: string, detail: string): ProblemDetails {
  return { type: `${PROBLEM_TYPE_BASE}/${slug}`, title, status, detail };
}

export const problems = {
  validation: (errors: FieldError[]) =>
    new HttpProblemError({
      ...problem('validation-error', 400, 'Solicitud inválida', 'El cuerpo de la solicitud no cumple el contrato esperado.'),
      errors,
    }),
  malformedJson: () =>
    new HttpProblemError(problem('malformed-json', 400, 'JSON mal formado', 'El cuerpo de la solicitud no es un JSON válido.')),
  invalidCredentials: () =>
    new HttpProblemError(
      problem('invalid-credentials', 401, 'Credenciales inválidas', 'El usuario o la contraseña no son correctos.')
    ),
  missingToken: () =>
    new HttpProblemError(
      problem('missing-token', 401, 'Token ausente', 'No llegó la cookie de sesión. Inicia sesión de nuevo.')
    ),
  invalidToken: () =>
    new HttpProblemError(
      problem('invalid-token', 401, 'Token inválido', 'El token está mal formado o su firma no es válida.')
    ),
  expiredToken: (expiredAt: Date) =>
    new HttpProblemError({
      ...problem('expired-token', 401, 'Token vencido', 'El token expiró. Inicia sesión de nuevo.'),
      expiredAt: expiredAt.toISOString(),
    }),
  notFound: () =>
    new HttpProblemError(problem('not-found', 404, 'Recurso no encontrado', 'La ruta solicitada no existe.')),
  methodNotAllowed: (allowedMethods: string[]) =>
    new HttpProblemError(
      problem('method-not-allowed', 405, 'Método no permitido', `Métodos permitidos: ${allowedMethods.join(', ')}.`),
      { Allow: allowedMethods.join(', ') }
    ),
  payloadTooLarge: (maxBytes: number) =>
    new HttpProblemError(
      problem('payload-too-large', 413, 'Cuerpo demasiado grande', `El cuerpo no puede superar ${maxBytes} bytes.`)
    ),
  unsupportedMediaType: () =>
    new HttpProblemError(
      problem('unsupported-media-type', 415, 'Tipo de contenido no soportado', 'Usa Content-Type: application/json.')
    ),
  internal: () =>
    new HttpProblemError(
      problem('internal-error', 500, 'Error interno', 'Ocurrió un error inesperado. Intenta de nuevo más tarde.')
    ),
};
