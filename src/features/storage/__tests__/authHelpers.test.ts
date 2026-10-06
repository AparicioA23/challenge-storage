import { describe, it, expect } from "vitest";
import {
  AuthApiError,
  describeAuthError,
  problemTypeToReason,
  toAuthSession,
  toTokenValidation,
  validateCredentials,
} from "../services/authHelpers";
import { CREDENTIAL_MAX_LENGTH } from "../const/cookies";

describe("validateCredentials", () => {
  it("should return an error when username is only whitespace", () => {
    // Arrange
    const credentials = { username: "   ", password: "secret" };

    // Act
    const result = validateCredentials(credentials);

    // Assert
    expect(result).toBe("Ingresa usuario y contraseña.");
  });

  it("should return an error when password exceeds the maximum length", () => {
    // Arrange
    const credentials = { username: "demo", password: "x".repeat(CREDENTIAL_MAX_LENGTH + 1) };

    // Act
    const result = validateCredentials(credentials);

    // Assert
    expect(result).toContain(String(CREDENTIAL_MAX_LENGTH));
  });

  it("should return null when credentials are complete", () => {
    // Arrange
    const credentials = { username: "demo", password: "secret" };

    // Act
    const result = validateCredentials(credentials);

    // Assert
    expect(result).toBeNull();
  });
});

describe("problemTypeToReason", () => {
  it("should map a known problem type to its reason", () => {
    // Arrange
    const problemType = "/problems/expired-token";

    // Act
    const reason = problemTypeToReason(problemType);

    // Assert
    expect(reason).toBe("expired-token");
  });

  it("should fall back to unexpected-response for unknown problem types", () => {
    // Arrange
    const problemType = "/problems/not-found";

    // Act
    const reason = problemTypeToReason(problemType);

    // Assert
    expect(reason).toBe("unexpected-response");
  });
});

describe("describeAuthError", () => {
  it("should return the reason message for an AuthApiError", () => {
    // Arrange
    const error = new AuthApiError("invalid-credentials");

    // Act
    const message = describeAuthError(error);

    // Assert
    expect(message).toBe("Usuario o contraseña incorrectos.");
  });

  it("should hide internal details of unknown errors", () => {
    // Arrange
    const error = new Error("stack trace with internals");

    // Act
    const message = describeAuthError(error);

    // Assert
    expect(message).not.toContain("internals");
  });
});

describe("toAuthSession", () => {
  it("should convert a login response into a session with its expiration", () => {
    // Arrange
    const body = { expiresAt: "2026-10-05T18:03:54.000Z", expiresIn: 300 };

    // Act
    const session = toAuthSession(body);

    // Assert
    expect(session).toEqual({ expiresAt: new Date("2026-10-05T18:03:54.000Z") });
  });

  it("should reject a login response with an invalid expiration date", () => {
    // Arrange
    const body = { expiresAt: "not-a-date" };

    // Act
    const convert = () => toAuthSession(body);

    // Assert
    expect(convert).toThrow(AuthApiError);
  });
});

describe("toTokenValidation", () => {
  it("should reject a validation response that is not marked as valid", () => {
    // Arrange
    const body = { valid: false, subject: "demo", expiresAt: "2026-10-05T18:03:54.000Z" };

    // Act
    const convert = () => toTokenValidation(body);

    // Assert
    expect(convert).toThrow(AuthApiError);
  });
});
