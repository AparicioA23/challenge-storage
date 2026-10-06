import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import CookiesStorageSection from "../CookiesStorageSection";
import { authApi } from "@features/storage/services/authApi";
import { cookieService } from "@features/storage/services/cookieService";
import { AuthApiError } from "@features/storage/services/authHelpers";

vi.mock("@features/storage/services/authApi", () => ({
  authApi: { login: vi.fn(), validateToken: vi.fn() },
}));

vi.mock("@features/storage/services/cookieService", () => ({
  cookieService: { save: vi.fn(), get: vi.fn(), remove: vi.fn() },
}));

const ACCEPTED_CONSENT = { cookiesConsent: "accepted" };
const ACTIVE_SESSION = { ...ACCEPTED_CONSENT, authSession: "2026-10-05T18:03:54.000Z" };
const EXPIRES_AT = new Date("2026-10-05T18:03:54.000Z");

const renderSection = (cookieSnapshot: Record<string, string> = {}) => {
  const context = {
    snapshots: { localStorage: {}, sessionStorage: {}, cookie: cookieSnapshot, indexedDB: {} },
    refresh: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  };
  render(
    <MemoryRouter initialEntries={["/cookie"]}>
      <Routes>
        <Route path="/" element={<Outlet context={context} />}>
          <Route path="cookie" element={<CookiesStorageSection />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return context;
};

const fillCredentials = (username: string, password: string) => {
  fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: password } });
};

describe("CookiesStorageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookieService.save).mockReturnValue(true);
    vi.mocked(cookieService.remove).mockReturnValue(true);
  });

  it("should disable login and token validation until cookies are accepted", () => {
    // Arrange
    renderSection();

    // Act
    const loginButton = screen.getByRole("button", { name: "Login" });
    const validateButton = screen.getByRole("button", { name: "Validar token" });

    // Assert
    expect(loginButton).toBeDisabled();
    expect(validateButton).toBeDisabled();
  });

  it("should save the consent cookie with an expiration when accepting cookies", async () => {
    // Arrange
    const context = renderSection();

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Aceptar cookies" }));

    // Assert
    expect(cookieService.save).toHaveBeenCalledWith(
      "cookiesConsent",
      "accepted",
      expect.objectContaining({ expires: 180 })
    );
    await waitFor(() => expect(context.refresh).toHaveBeenCalled());
  });

  it("should track the session in a readable cookie that expires with the token", async () => {
    // Arrange
    vi.mocked(authApi.login).mockResolvedValue({ expiresAt: EXPIRES_AT });
    renderSection(ACCEPTED_CONSENT);
    fillCredentials("demo", "secret");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    // Assert
    expect(await screen.findByText(/Sesión iniciada/)).toBeInTheDocument();
    expect(cookieService.save).toHaveBeenCalledWith(
      "authSession",
      EXPIRES_AT.toISOString(),
      expect.objectContaining({ expires: EXPIRES_AT, sameSite: "Strict" })
    );
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  });

  it("should not call the backend when credentials are empty", () => {
    // Arrange
    renderSection(ACCEPTED_CONSENT);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Ingresa usuario y contraseña.");
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("should show an error and keep cookies untouched when credentials are rejected", async () => {
    // Arrange
    vi.mocked(authApi.login).mockRejectedValue(new AuthApiError("invalid-credentials"));
    renderSection(ACCEPTED_CONSENT);
    fillCredentials("demo", "wrong");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    // Assert
    expect(await screen.findByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
    expect(cookieService.save).not.toHaveBeenCalled();
  });

  it("should show the token subject when the backend accepts the session", async () => {
    // Arrange
    vi.mocked(authApi.validateToken).mockResolvedValue({ subject: "demo", expiresAt: EXPIRES_AT });
    renderSection(ACTIVE_SESSION);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Validar token" }));

    // Assert
    expect(await screen.findByText(/Token válido para "demo"/)).toBeInTheDocument();
    expect(authApi.validateToken).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(cookieService.get).not.toHaveBeenCalled();
  });

  it("should remove the session cookie when the backend reports the token expired", async () => {
    // Arrange
    vi.mocked(authApi.validateToken).mockRejectedValue(new AuthApiError("expired-token"));
    renderSection(ACTIVE_SESSION);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Validar token" }));

    // Assert
    expect(await screen.findByText("El token venció. Inicia sesión de nuevo.")).toBeInTheDocument();
    expect(cookieService.remove).toHaveBeenCalledWith("authSession");
  });

  it("should remove the session cookie when the token cookie no longer reaches the backend", async () => {
    // Arrange
    vi.mocked(authApi.validateToken).mockRejectedValue(new AuthApiError("missing-token"));
    renderSection(ACTIVE_SESSION);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Validar token" }));

    // Assert
    expect(await screen.findByText(/la cookie del token ya venció/)).toBeInTheDocument();
    expect(cookieService.remove).toHaveBeenCalledWith("authSession");
  });

  it("should keep the session cookie when the backend is unreachable", async () => {
    // Arrange
    vi.mocked(authApi.validateToken).mockRejectedValue(new AuthApiError("network"));
    renderSection(ACTIVE_SESSION);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Validar token" }));

    // Assert
    expect(await screen.findByText(/No fue posible conectar/)).toBeInTheDocument();
    expect(cookieService.remove).not.toHaveBeenCalled();
  });
});
