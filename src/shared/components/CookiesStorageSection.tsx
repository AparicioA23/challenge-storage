import React, { FormEvent } from "react";
import TextField from "@shared/components/UI/TextField";
import Button from "@shared/components/UI/Button";
import useCookieSession from "@/features/storage/hooks/useCookieSession";
import { CREDENTIAL_MAX_LENGTH } from "@/features/storage/const/cookies";

const preventNativeSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

const CookiesStorageSection = () => {
  const {
    credentials,
    onChangeUsername,
    onChangePassword,
    acceptCookies,
    login,
    validateToken,
    hasConsent,
    pendingAction,
    feedback,
    canAcceptCookies,
    canLogin,
    canValidateToken,
  } = useCookieSession();

  return (
    <section
      className="cookies-storage-section"
      aria-labelledby="cookies-storage-section-title"
      aria-busy={pendingAction !== null}
    >
      <h2
        id="cookies-storage-section-title"
        className="cookies-storage-section__title"
      >
        Cookies y sesión
      </h2>
      <form
        className="cookies-storage-section__form"
        onSubmit={preventNativeSubmit}
        noValidate
      >
        <div className="cookies-storage-section__fields">
          <TextField
            label="Usuario"
            name="username"
            autoComplete="username"
            maxLength={CREDENTIAL_MAX_LENGTH}
            value={credentials.username}
            onChange={onChangeUsername}
            disabled={!hasConsent}
          />
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={CREDENTIAL_MAX_LENGTH}
            value={credentials.password}
            onChange={onChangePassword}
            disabled={!hasConsent}
          />
        </div>
        <div className="cookies-storage-section__actions">
          <Button
            title={hasConsent ? "Cookies aceptadas" : "Aceptar cookies"}
            onClick={acceptCookies}
            disabled={!canAcceptCookies}
          />
          <Button
            type="submit"
            title={pendingAction === "login" ? "Ingresando…" : "Login"}
            onClick={login}
            disabled={!canLogin}
          />
          <Button
            title={pendingAction === "validate" ? "Validando…" : "Validar token"}
            onClick={validateToken}
            disabled={!canValidateToken}
          />
        </div>
      </form>
      <p
        role="status"
        className={`cookies-storage-section__feedback cookies-storage-section__feedback--${feedback?.kind ?? "idle"}`}
      >
        {feedback?.text}
      </p>
    </section>
  );
};

export default React.memo(CookiesStorageSection);
