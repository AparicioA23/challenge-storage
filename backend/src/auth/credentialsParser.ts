import { problems, type FieldError } from '../http/problems.ts';
import type { Credentials } from './authTypes.ts';

const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 200;

export function parseCredentials(body: unknown): Credentials {
  const candidate = isRecord(body) ? body : {};
  const errors = [
    validateText('username', candidate.username, MAX_USERNAME_LENGTH),
    validateText('password', candidate.password, MAX_PASSWORD_LENGTH),
  ].filter((error): error is FieldError => error !== null);

  if (errors.length > 0) {
    throw problems.validation(errors);
  }
  return { username: candidate.username as string, password: candidate.password as string };
}

function validateText(field: string, value: unknown, maxLength: number): FieldError | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { field, message: 'Es obligatorio y debe ser un texto no vacío.' };
  }
  if (value.length > maxLength) {
    return { field, message: `No puede superar ${maxLength} caracteres.` };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
