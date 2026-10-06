import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HttpAuthApi } from "../services/authApi";
import { AuthApiError } from "../services/authHelpers";

const BASE_URL = "http://auth.test";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("HttpAuthApi", () => {
  const fetchMock = vi.fn();
  let api: HttpAuthApi;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    api = new HttpAuthApi(`${BASE_URL}/`);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should post trimmed credentials including cookies and return the session expiration", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { expiresAt: "2026-10-05T18:03:54.000Z", expiresIn: 300 }));

    // Act
    const session = await api.login({ username: " demo ", password: "secret" });

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/auth/login`);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ username: "demo", password: "secret" }),
    });
    expect(session.expiresAt).toEqual(new Date("2026-10-05T18:03:54.000Z"));
  });

  it("should reject with invalid-credentials when the backend returns that problem", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(401, { type: "/problems/invalid-credentials", status: 401 }));

    // Act
    const result = api.login({ username: "demo", password: "wrong" });

    // Assert
    await expect(result).rejects.toMatchObject({ reason: "invalid-credentials" });
  });

  it("should let the browser send the token cookie when validating", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(200, { valid: true, subject: "demo", expiresAt: "2026-10-05T18:03:54.000Z" })
    );

    // Act
    const validation = await api.validateToken();

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/auth/validate`);
    expect(init).toMatchObject({ method: "GET", credentials: "include" });
    expect(init.headers).toBeUndefined();
    expect(validation.subject).toBe("demo");
  });

  it("should reject with a network error when the server is unreachable", async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    // Act
    const result = api.validateToken();

    // Assert
    await expect(result).rejects.toBeInstanceOf(AuthApiError);
    await expect(result).rejects.toMatchObject({ reason: "network" });
  });

  it("should propagate the abort error when the request is cancelled", async () => {
    // Arrange
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    // Act
    const result = api.validateToken(new AbortController().signal);

    // Assert
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
});
