import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { StorageManagerContext } from "./useStorageManager";
import type { CookieStorageService } from "../types/storageTypes";
import type { AuthApi, CookieSessionAction, CookieSessionFeedback, Credentials } from "../types/auth";
import {
  AUTH_SESSION_COOKIE_KEY,
  COOKIES_CONSENT_EXPIRY_DAYS,
  COOKIES_CONSENT_KEY,
  COOKIES_CONSENT_VALUE,
  EMPTY_CREDENTIALS,
} from "../const/cookies";
import { AuthApiError, describeAuthError, formatExpiry, validateCredentials } from "../services/authHelpers";
import { authApi as defaultAuthApi } from "../services/authApi";
import { cookieService } from "../services/cookieService";

interface CookieSessionDependencies {
  authApi: AuthApi;
  cookies: CookieStorageService;
}

type AuthRequest = (signal: AbortSignal) => Promise<CookieSessionFeedback>;

const DEFAULT_DEPENDENCIES: CookieSessionDependencies = { authApi: defaultAuthApi, cookies: cookieService };
const REJECTED_SESSION_REASONS = new Set(["missing-token", "invalid-token", "expired-token"]);

const success = (text: string): CookieSessionFeedback => ({ kind: "success", text });
const failure = (text: string): CookieSessionFeedback => ({ kind: "error", text });
const isSecurePage = () => window.location.protocol === "https:";
const isRejectedSession = (error: unknown) =>
  error instanceof AuthApiError && REJECTED_SESSION_REASONS.has(error.reason);

const useAuthRequestRunner = () => {
  const [pendingAction, setPendingAction] = useState<CookieSessionAction | null>(null);
  const [feedback, setFeedback] = useState<CookieSessionFeedback | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const runRequest = useCallback(async (action: CookieSessionAction, request: AuthRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingAction(action);
    setFeedback(null);
    try {
      setFeedback(await request(controller.signal));
    } catch (error) {
      if (!controller.signal.aborted) setFeedback(failure(describeAuthError(error)));
    } finally {
      if (!controller.signal.aborted) setPendingAction(null);
    }
  }, []);

  return { pendingAction, feedback, setFeedback, runRequest };
};

const useCookieSession = ({ authApi, cookies }: CookieSessionDependencies = DEFAULT_DEPENDENCIES) => {
  const { snapshots, refresh, isLoading } = useOutletContext<StorageManagerContext>();
  const { pendingAction, feedback, setFeedback, runRequest } = useAuthRequestRunner();
  const [credentials, setCredentials] = useState<Credentials>(EMPTY_CREDENTIALS);

  const hasConsent = snapshots.cookie[COOKIES_CONSENT_KEY] === COOKIES_CONSENT_VALUE;
  const hasSession = AUTH_SESSION_COOKIE_KEY in snapshots.cookie;
  const isBusy = isLoading || pendingAction !== null;

  const onChangeUsername = useCallback((username: string) => setCredentials((prev) => ({ ...prev, username })), []);
  const onChangePassword = useCallback((password: string) => setCredentials((prev) => ({ ...prev, password })), []);

  const acceptCookies = useCallback(async () => {
    const saved = cookies.save(COOKIES_CONSENT_KEY, COOKIES_CONSENT_VALUE, {
      expires: COOKIES_CONSENT_EXPIRY_DAYS,
      sameSite: "Lax",
      secure: isSecurePage(),
    });
    setFeedback(
      saved
        ? success(`Cookies aceptadas por ${COOKIES_CONSENT_EXPIRY_DAYS} días.`)
        : failure("No fue posible guardar el consentimiento de cookies.")
    );
    if (saved) await refresh();
  }, [cookies, refresh, setFeedback]);

  const startSession = useCallback(
    async (signal: AbortSignal) => {
      const { expiresAt } = await authApi.login(credentials, signal);
      cookies.save(AUTH_SESSION_COOKIE_KEY, expiresAt.toISOString(), {
        expires: expiresAt,
        sameSite: "Strict",
        secure: isSecurePage(),
      });
      setCredentials((prev) => ({ ...prev, password: "" }));
      await refresh();
      return success(`Sesión iniciada. El token vence a las ${formatExpiry(expiresAt)}.`);
    },
    [authApi, cookies, credentials, refresh]
  );

  const login = useCallback(async () => {
    const validationError = hasConsent ? validateCredentials(credentials) : "Acepta las cookies antes de iniciar sesión.";
    if (validationError) {
      setFeedback(failure(validationError));
      return;
    }
    await runRequest("login", startSession);
  }, [credentials, hasConsent, runRequest, setFeedback, startSession]);

  const endSession = useCallback(async () => {
    cookies.remove(AUTH_SESSION_COOKIE_KEY);
    await refresh();
  }, [cookies, refresh]);

  const checkSession = useCallback(
    async (signal: AbortSignal) => {
      try {
        const { subject, expiresAt } = await authApi.validateToken(signal);
        return success(`Token válido para "${subject}" hasta las ${formatExpiry(expiresAt)}.`);
      } catch (error) {
        if (isRejectedSession(error)) await endSession();
        throw error;
      }
    },
    [authApi, endSession]
  );

  const validateToken = useCallback(() => runRequest("validate", checkSession), [checkSession, runRequest]);

  return {
    credentials,
    onChangeUsername,
    onChangePassword,
    acceptCookies,
    login,
    validateToken,
    hasConsent,
    pendingAction,
    feedback,
    canAcceptCookies: !hasConsent && !isBusy,
    canLogin: hasConsent && !isBusy,
    canValidateToken: hasConsent && hasSession && !isBusy,
  };
};

export default useCookieSession;
