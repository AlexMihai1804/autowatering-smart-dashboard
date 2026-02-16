const env = import.meta.env as Record<string, string | undefined>;

const TOKENS_STORAGE_KEY = 'autowater_cognito_tokens_v1';
const GOOGLE_PKCE_STORAGE_KEY = 'autowater_cognito_pkce_v1';
const GOOGLE_STATE_STORAGE_KEY = 'autowater_cognito_state_v1';

export interface CognitoConfig {
    region: string;
    userPoolId: string;
    appClientId: string;
    hostedUiDomain: string;
    redirectUri: string;
    logoutUri: string;
}

export interface CognitoTokens {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresAt: number;
    issuedAt: number;
}

export interface CognitoTokenClaims {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    picture?: string;
    auth_time?: number;
    [key: string]: unknown;
}

const cognitoConfig: CognitoConfig = {
    region: env.VITE_AWS_REGION?.trim() || '',
    userPoolId: env.VITE_COGNITO_USER_POOL_ID?.trim() || '',
    appClientId: env.VITE_COGNITO_APP_CLIENT_ID?.trim() || '',
    hostedUiDomain: env.VITE_COGNITO_HOSTED_UI_DOMAIN?.trim() || '',
    redirectUri: env.VITE_COGNITO_REDIRECT_URI?.trim() || '',
    logoutUri: env.VITE_COGNITO_LOGOUT_URI?.trim() || ''
};

function parseEnvBoolean(value: string | undefined): boolean {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
}

const googleSignInEnabled = parseEnvBoolean(env.VITE_COGNITO_GOOGLE_ENABLED);

const isCognitoConfigured = Boolean(
    cognitoConfig.region
    && cognitoConfig.userPoolId
    && cognitoConfig.appClientId
);

const isGoogleSignInConfigured = Boolean(
    isCognitoConfigured
    && googleSignInEnabled
    && cognitoConfig.hostedUiDomain
    && cognitoConfig.redirectUri
);

function getCognitoApiEndpoint(): string {
    return `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`;
}

function getHostedUiEndpoint(): string {
    const domain = cognitoConfig.hostedUiDomain;
    if (domain.startsWith('https://') || domain.startsWith('http://')) {
        return domain.replace(/\/$/, '');
    }
    return `https://${domain.replace(/\/$/, '')}`;
}

function base64UrlToJson<T>(value: string): T {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
}

function decodeJwtClaims(token: string): CognitoTokenClaims {
    const segments = token.split('.');
    if (segments.length < 2) {
        throw new Error('Invalid token');
    }
    return base64UrlToJson<CognitoTokenClaims>(segments[1]);
}

function normalizeCognitoError(payload: any, fallbackMessage: string): Error {
    const errorType = typeof payload?.__type === 'string'
        ? payload.__type.split('#').pop()
        : '';
    const message = typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message.trim()
        : fallbackMessage;

    const mapped = (() => {
        switch (errorType) {
            case 'UserNotConfirmedException':
                return 'Accountul nu este confirmat. Verifica email-ul.';
            case 'NotAuthorizedException':
                return 'Email sau parola invalida.';
            case 'UserNotFoundException':
                return 'Contul nu exista.';
            case 'UsernameExistsException':
                return 'Exista deja un cont cu acest email.';
            case 'InvalidPasswordException':
                return 'Parola trebuie sa aiba minim 8 caractere si sa contina litera mare, litera mica, cifra si simbol.';
            case 'CodeMismatchException':
                return 'Cod de verificare invalid.';
            case 'ExpiredCodeException':
                return 'Codul a expirat.';
            default:
                return message;
        }
    })();

    const error = new Error(mapped) as Error & { cognitoErrorType?: string };
    if (errorType) {
        error.cognitoErrorType = errorType;
    }
    return error;
}

async function callCognito<T>(target: string, body: Record<string, unknown>): Promise<T> {
    if (!isCognitoConfigured) {
        throw new Error('Cognito is not configured.');
    }

    const response = await fetch(getCognitoApiEndpoint(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`
        },
        body: JSON.stringify(body)
    });

    const text = await response.text();
    let payload: any = {};
    if (text.trim()) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = { message: text };
        }
    }

    if (!response.ok) {
        throw normalizeCognitoError(payload, `Cognito error (${response.status})`);
    }

    return payload as T;
}

function parseTokens(value: unknown): CognitoTokens | null {
    if (!value || typeof value !== 'object') return null;
    const source = value as Record<string, unknown>;

    const idToken = typeof source.idToken === 'string' ? source.idToken : '';
    const accessToken = typeof source.accessToken === 'string' ? source.accessToken : '';
    const refreshToken = typeof source.refreshToken === 'string' ? source.refreshToken : '';
    const tokenType = typeof source.tokenType === 'string' ? source.tokenType : 'Bearer';
    const expiresAt = typeof source.expiresAt === 'number' ? source.expiresAt : 0;
    const issuedAt = typeof source.issuedAt === 'number' ? source.issuedAt : 0;

    if (!idToken || !accessToken || !refreshToken || !expiresAt) {
        return null;
    }

    return {
        idToken,
        accessToken,
        refreshToken,
        tokenType,
        expiresAt,
        issuedAt
    };
}

function saveTokens(tokens: CognitoTokens): void {
    try {
        localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
    } catch {
        // ignore storage errors
    }
}

function readTokens(): CognitoTokens | null {
    try {
        const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
        if (!raw) return null;
        return parseTokens(JSON.parse(raw));
    } catch {
        return null;
    }
}

function clearTokens(): void {
    try {
        localStorage.removeItem(TOKENS_STORAGE_KEY);
    } catch {
        // ignore storage errors
    }
}

function tokensFromAuthenticationResult(authenticationResult: any, existingRefreshToken = ''): CognitoTokens {
    const idToken = typeof authenticationResult?.IdToken === 'string' ? authenticationResult.IdToken : '';
    const accessToken = typeof authenticationResult?.AccessToken === 'string' ? authenticationResult.AccessToken : '';
    const refreshToken = typeof authenticationResult?.RefreshToken === 'string'
        ? authenticationResult.RefreshToken
        : existingRefreshToken;
    const tokenType = typeof authenticationResult?.TokenType === 'string'
        ? authenticationResult.TokenType
        : 'Bearer';
    const expiresIn = typeof authenticationResult?.ExpiresIn === 'number'
        ? authenticationResult.ExpiresIn
        : 3600;

    if (!idToken || !accessToken || !refreshToken) {
        throw new Error('Invalid Cognito authentication result.');
    }

    const claims = decodeJwtClaims(idToken);
    const expFromToken = typeof claims.exp === 'number' ? claims.exp : null;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = expFromToken ?? (nowSeconds + expiresIn);

    return {
        idToken,
        accessToken,
        refreshToken,
        tokenType,
        expiresAt,
        issuedAt: nowSeconds
    };
}

function shouldRefresh(tokens: CognitoTokens): boolean {
    const now = Math.floor(Date.now() / 1000);
    return tokens.expiresAt <= now + 60;
}

async function refreshTokens(refreshToken: string): Promise<CognitoTokens> {
    const data = await callCognito<any>('InitiateAuth', {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: cognitoConfig.appClientId,
        AuthParameters: {
            REFRESH_TOKEN: refreshToken
        }
    });

    if (!data?.AuthenticationResult) {
        throw new Error('Failed to refresh Cognito session.');
    }

    const tokens = tokensFromAuthenticationResult(data.AuthenticationResult, refreshToken);
    saveTokens(tokens);
    return tokens;
}

export function getCognitoClaimsFromIdToken(idToken: string): CognitoTokenClaims {
    return decodeJwtClaims(idToken);
}

export async function getValidCognitoTokens(forceRefresh = false): Promise<CognitoTokens | null> {
    const current = readTokens();
    if (!current) return null;

    if (forceRefresh || shouldRefresh(current)) {
        try {
            return await refreshTokens(current.refreshToken);
        } catch {
            clearTokens();
            return null;
        }
    }

    return current;
}

export async function getCognitoIdToken(forceRefresh = false): Promise<string | null> {
    const tokens = await getValidCognitoTokens(forceRefresh);
    return tokens?.idToken || null;
}

export async function getCognitoIdTokenClaims(forceRefresh = false): Promise<CognitoTokenClaims | null> {
    const idToken = await getCognitoIdToken(forceRefresh);
    if (!idToken) return null;
    try {
        return decodeJwtClaims(idToken);
    } catch {
        return null;
    }
}

export async function signInCognito(email: string, password: string): Promise<void> {
    const data = await callCognito<any>('InitiateAuth', {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: cognitoConfig.appClientId,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password
        }
    });

    if (data?.ChallengeName) {
        throw new Error(`Auth challenge unsupported: ${data.ChallengeName}`);
    }

    if (!data?.AuthenticationResult) {
        throw new Error('Cognito did not return an authentication result.');
    }

    saveTokens(tokensFromAuthenticationResult(data.AuthenticationResult));
}

export async function signUpCognito(email: string, password: string): Promise<{ userConfirmed: boolean }> {
    const data = await callCognito<any>('SignUp', {
        ClientId: cognitoConfig.appClientId,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email }
        ]
    });

    return {
        userConfirmed: data?.UserConfirmed === true
    };
}

export async function confirmSignUpCognito(email: string, code: string): Promise<void> {
    await callCognito<any>('ConfirmSignUp', {
        ClientId: cognitoConfig.appClientId,
        Username: email,
        ConfirmationCode: code
    });
}

export async function resendSignUpCodeCognito(email: string): Promise<void> {
    await callCognito<any>('ResendConfirmationCode', {
        ClientId: cognitoConfig.appClientId,
        Username: email
    });
}

export async function signOutCognito(): Promise<void> {
    const tokens = await getValidCognitoTokens(false);
    try {
        if (tokens?.accessToken) {
            await callCognito<any>('GlobalSignOut', {
                AccessToken: tokens.accessToken
            });
        }
    } catch {
        // ignore global sign-out failures
    } finally {
        clearTokens();
    }
}

export async function sendCognitoEmailVerification(): Promise<void> {
    const tokens = await getValidCognitoTokens(false);
    if (!tokens) throw new Error('Login required.');

    await callCognito<any>('GetUserAttributeVerificationCode', {
        AccessToken: tokens.accessToken,
        AttributeName: 'email'
    });
}

export async function changeCognitoPassword(currentPassword: string, newPassword: string): Promise<void> {
    const tokens = await getValidCognitoTokens(false);
    if (!tokens) throw new Error('Login required.');

    await callCognito<any>('ChangePassword', {
        AccessToken: tokens.accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword
    });
}

export async function deleteCognitoUser(): Promise<void> {
    const tokens = await getValidCognitoTokens(false);
    if (!tokens) throw new Error('Login required.');

    await callCognito<any>('DeleteUser', {
        AccessToken: tokens.accessToken
    });
    clearTokens();
}

function randomBase64Url(length = 64): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const arr = Array.from(new Uint8Array(digest));
    let binary = '';
    for (const item of arr) {
        binary += String.fromCharCode(item);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function startGoogleSignIn(): Promise<void> {
    if (!isGoogleSignInConfigured) {
        throw new Error('Google sign-in via Cognito Hosted UI is not configured.');
    }

    const state = randomBase64Url(24);
    const verifier = randomBase64Url(64);
    const challenge = await sha256Base64Url(verifier);

    try {
        localStorage.setItem(GOOGLE_STATE_STORAGE_KEY, state);
        localStorage.setItem(GOOGLE_PKCE_STORAGE_KEY, verifier);
    } catch {
        // ignore storage failures, flow will fail safely if missing
    }

    const params = new URLSearchParams({
        identity_provider: 'Google',
        redirect_uri: cognitoConfig.redirectUri,
        response_type: 'code',
        client_id: cognitoConfig.appClientId,
        scope: 'openid email profile',
        state,
        code_challenge_method: 'S256',
        code_challenge: challenge
    });

    window.location.assign(`${getHostedUiEndpoint()}/oauth2/authorize?${params.toString()}`);
}

function cleanupHostedUiStorage(): void {
    try {
        localStorage.removeItem(GOOGLE_PKCE_STORAGE_KEY);
        localStorage.removeItem(GOOGLE_STATE_STORAGE_KEY);
    } catch {
        // ignore
    }
}

export async function completeGoogleSignInFromUrl(search: string): Promise<boolean> {
    if (!isGoogleSignInConfigured) return false;

    const params = new URLSearchParams(search);
    const code = params.get('code')?.trim() || '';
    const state = params.get('state')?.trim() || '';
    if (!code || !state) return false;

    const expectedState = localStorage.getItem(GOOGLE_STATE_STORAGE_KEY) || '';
    const verifier = localStorage.getItem(GOOGLE_PKCE_STORAGE_KEY) || '';
    if (!expectedState || !verifier || expectedState !== state) {
        cleanupHostedUiStorage();
        throw new Error('Invalid OAuth state for Google sign-in.');
    }

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cognitoConfig.appClientId,
        code,
        redirect_uri: cognitoConfig.redirectUri,
        code_verifier: verifier
    });

    const response = await fetch(`${getHostedUiEndpoint()}/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    const text = await response.text();
    let payload: any = {};
    if (text.trim()) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = { message: text };
        }
    }

    cleanupHostedUiStorage();

    if (!response.ok) {
        throw new Error(payload?.error_description || payload?.error || 'Failed to complete Google sign-in.');
    }

    const tokens = tokensFromAuthenticationResult({
        IdToken: payload.id_token,
        AccessToken: payload.access_token,
        RefreshToken: payload.refresh_token,
        TokenType: payload.token_type,
        ExpiresIn: payload.expires_in
    });

    saveTokens(tokens);
    return true;
}

export function clearCognitoSession(): void {
    clearTokens();
}

export {
    cognitoConfig,
    isCognitoConfigured,
    isGoogleSignInConfigured
};
