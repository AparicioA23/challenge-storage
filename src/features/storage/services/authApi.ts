import type { AuthApi, AuthSession, Credentials, TokenValidation } from "../types/auth";
import { AuthApiError, problemTypeToReason, toAuthSession, toTokenValidation } from "./authHelpers";

const DEFAULT_AUTH_API_URL = "http://localhost:4000";

export class HttpAuthApi implements AuthApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async login(credentials: Credentials, signal?: AbortSignal): Promise<AuthSession> {
    const body = await this.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: credentials.username.trim(), password: credentials.password }),
      signal,
    });
    return toAuthSession(body);
  }

  async validateToken(signal?: AbortSignal): Promise<TokenValidation> {
    const body = await this.request("/api/auth/validate", { method: "GET", signal });
    return toTokenValidation(body);
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const response = await this.send(path, init);
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AuthApiError(problemTypeToReason((body as { type?: unknown } | null)?.type));
    }
    return body;
  }

  private async send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, { ...init, credentials: "include", cache: "no-store" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new AuthApiError("network");
    }
  }
}

export const authApi: AuthApi = new HttpAuthApi(import.meta.env.VITE_AUTH_API_URL ?? DEFAULT_AUTH_API_URL);
