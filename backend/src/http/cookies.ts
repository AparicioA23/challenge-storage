export interface CookieAttributes {
  path: string;
  maxAgeSeconds: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax';
}

export function serializeCookie(name: string, value: string, attributes: CookieAttributes): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${attributes.path}`,
    `Max-Age=${attributes.maxAgeSeconds}`,
    `SameSite=${attributes.sameSite}`,
  ];
  if (attributes.httpOnly) parts.push('HttpOnly');
  if (attributes.secure) parts.push('Secure');
  return parts.join('; ');
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  for (const pair of cookieHeader?.split(';') ?? []) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex > 0 && pair.slice(0, separatorIndex).trim() === name) {
      return safeDecode(pair.slice(separatorIndex + 1).trim());
    }
  }
  return undefined;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
