import type {
  Authenticator,
  Credentials,
  CredentialsVerifier,
  LoginResult,
  TokenService,
  TokenVerification,
} from './authTypes.ts';

export class AuthService implements Authenticator {
  readonly #credentialsVerifier: CredentialsVerifier;
  readonly #tokenService: TokenService;

  constructor(credentialsVerifier: CredentialsVerifier, tokenService: TokenService) {
    this.#credentialsVerifier = credentialsVerifier;
    this.#tokenService = tokenService;
  }

  login(credentials: Credentials): LoginResult {
    if (!this.#credentialsVerifier.verify(credentials)) {
      return { status: 'rejected' };
    }
    return { status: 'authenticated', issuedToken: this.#tokenService.issue(credentials.username) };
  }

  validate(token: string): TokenVerification {
    return this.#tokenService.verify(token);
  }
}
