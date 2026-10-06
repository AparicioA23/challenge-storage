import type { AuthErrorReason, AuthSession, Credentials, TokenValidation } from "../types/auth";
import { CREDENTIAL_MAX_LENGTH } from "../const/cookies";

const PROBLEM_REASONS: Record<string, AuthErrorReason> = {
  "/problems/invalid-credentials": "invalid-credentials",
  "/problems/validation-error": "invalid-request",
  "/problems/malformed-json": "invalid-request",
  "/problems/missing-token": "missing-token",
  "/problems/invalid-token": "invalid-token",
  "/problems/expired-token": "expired-token",
};

const ERROR_MESSAGES: Record<AuthErrorReason, string> = {
  "invalid-credentials": "Usuario o contraseña incorrectos.",
  "invalid-request": "La solicitud no es válida. Revisa los datos ingresados.",
  "missing-token": "No hay sesión activa o la cookie del token ya venció. Inicia sesión de nuevo.",
  "invalid-token": "El token no es válido. Inicia sesión de nuevo.",
  "expired-token": "El token venció. Inicia sesión de nuevo.",
  network: "No fue posible conectar con el servidor de autenticación.",
  "unexpected-response": "El servidor respondió con un formato inesperado.",
};

export class AuthApiError extends Error {
  readonly reason: AuthErrorReason;

  constructor(reason: AuthErrorReason) {
    super(ERROR_MESSAGES[reason]);
    this.name = "AuthApiError";
    this.reason = reason;
  }
}

export function validateCredentials(credentials: Credentials): string | null {
  const username = credentials.username.trim();
  if (!username || !credentials.password) {
    return "Ingresa usuario y contraseña.";
  }
  if (username.length > CREDENTIAL_MAX_LENGTH || credentials.password.length > CREDENTIAL_MAX_LENGTH) {
    return `Usuario y contraseña admiten máximo ${CREDENTIAL_MAX_LENGTH} caracteres.`;
  }
  return null;
}

export function problemTypeToReason(problemType: unknown): AuthErrorReason {
  return typeof problemType === "string" ? PROBLEM_REASONS[problemType] ?? "unexpected-response" : "unexpected-response";
}

export function describeAuthError(error: unknown): string {
  return error instanceof AuthApiError ? error.message : ERROR_MESSAGES["unexpected-response"];
}

export function toAuthSession(body: unknown): AuthSession {
  const expiresAt = toDate(asRecord(body).expiresAt);
  if (!expiresAt) {
    throw new AuthApiError("unexpected-response");
  }
  return { expiresAt };
}

export function toTokenValidation(body: unknown): TokenValidation {
  const record = asRecord(body);
  const expiresAt = toDate(record.expiresAt);
  if (record.valid !== true || typeof record.subject !== "string" || !expiresAt) {
    throw new AuthApiError("unexpected-response");
  }
  return { subject: record.subject, expiresAt };
}

export function formatExpiry(date: Date): string {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
