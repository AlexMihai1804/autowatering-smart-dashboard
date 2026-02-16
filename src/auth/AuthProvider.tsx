import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';
import { Capacitor } from '@capacitor/core';
import {
    changeCognitoPassword,
    confirmSignUpCognito,
    completeGoogleSignInFromUrl,
    getCognitoIdToken,
    getCognitoIdTokenClaims,
    isCognitoConfigured,
    isGoogleSignInConfigured,
    resendSignUpCodeCognito,
    sendCognitoEmailVerification,
    signInCognito,
    signOutCognito,
    signUpCognito,
    startGoogleSignIn
} from '../lib/cognitoClient';

const GUEST_MODE_KEY = 'autowater_guest_mode';

const env = import.meta.env as Record<string, string | undefined>;
const AI_DOCTOR_URL = env.VITE_AI_DOCTOR_API_URL?.trim() || '';
const EXPLICIT_SUBSCRIPTION_STATUS_URL = env.VITE_SUBSCRIPTION_STATUS_API_URL?.trim() || '';
const EXPLICIT_CHECKOUT_URL = env.VITE_SUBSCRIPTION_CHECKOUT_API_URL?.trim() || '';
const EXPLICIT_BILLING_PORTAL_URL = env.VITE_SUBSCRIPTION_BILLING_PORTAL_API_URL?.trim() || '';
const EXPLICIT_PROFILE_GET_URL = env.VITE_PROFILE_GET_API_URL?.trim() || '';
const EXPLICIT_PROFILE_UPDATE_URL = env.VITE_PROFILE_UPDATE_API_URL?.trim() || '';
const EXPLICIT_USER_STATE_GET_URL = env.VITE_USER_STATE_GET_API_URL?.trim() || '';
const EXPLICIT_USER_STATE_SAVE_URL = env.VITE_USER_STATE_SAVE_API_URL?.trim() || '';
const EXPLICIT_ACCOUNT_DELETE_URL = env.VITE_ACCOUNT_DELETE_API_URL?.trim() || '';
const APP_URL_SCHEME = (env.VITE_APP_URL_SCHEME?.trim() || 'autowatering').toLowerCase();

const defaultPremiumState: PremiumState = {
    isPremium: false,
    status: null,
    plan: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    source: null
};

export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
    getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>;
}

interface PremiumState {
    isPremium: boolean;
    status: string | null;
    plan: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    source: string | null;
}

export interface UserProfileState {
    displayName: string | null;
    photoURL: string | null;
    email: string | null;
    emailVerified: boolean;
    language: string | null;
    unitSystem: string | null;
    theme: string | null;
    notificationsEnabled: boolean | null;
    phone: string | null;
    company: string | null;
    country: string | null;
    createdAt: string | null;
    lastSignInAt: string | null;
    updatedAt: string | null;
}

interface ProfilePatch {
    displayName?: string;
    photoURL?: string;
    language?: string;
    unitSystem?: string;
    theme?: string;
    notificationsEnabled?: boolean;
    phone?: string;
    company?: string;
    country?: string;
}

interface AuthContextValue {
    authConfigured: boolean;
    loading: boolean;
    user: AppUser | null;
    isGuest: boolean;
    isAuthenticated: boolean;
    premium: PremiumState;
    premiumLoading: boolean;
    profile: UserProfileState | null;
    profileLoading: boolean;
    signInUser: (email: string, password: string) => Promise<void>;
    signUpUser: (email: string, password: string) => Promise<{ userConfirmed: boolean }>;
    confirmSignUp: (email: string, code: string) => Promise<void>;
    resendSignUpCode: (email: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOutUser: () => Promise<void>;
    continueAsGuest: () => void;
    exitGuestMode: () => void;
    refreshPremiumStatus: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    saveProfile: (patch: ProfilePatch) => Promise<void>;
    sendVerification: () => Promise<void>;
    changePasswordForCurrentUser: (currentPassword: string, newPassword: string) => Promise<void>;
    deleteCurrentAccount: (currentPassword: string) => Promise<void>;
    loadCloudState: () => Promise<Record<string, unknown> | null>;
    saveCloudState: (state: Record<string, unknown>, version?: string) => Promise<void>;
    startPremiumCheckout: () => Promise<string>;
    openBillingPortal: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistGuestMode(enabled: boolean): void {
    try {
        if (enabled) {
            localStorage.setItem(GUEST_MODE_KEY, '1');
        } else {
            localStorage.removeItem(GUEST_MODE_KEY);
        }
    } catch {
        // ignore storage failures
    }
}

function readGuestMode(): boolean {
    try {
        return localStorage.getItem(GUEST_MODE_KEY) === '1';
    } catch {
        return false;
    }
}

function deriveEndpointFromAiDoctor(functionName: string): string {
    if (!AI_DOCTOR_URL) return '';

    try {
        const parsed = new URL(AI_DOCTOR_URL);
        if (parsed.pathname.endsWith('/aiDoctor')) {
            parsed.pathname = parsed.pathname.slice(0, -'/aiDoctor'.length) + `/${functionName}`;
            return parsed.toString();
        }
        return '';
    } catch {
        return '';
    }
}

function normalizeAppUrlScheme(input: string): string {
    const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9+.-]/g, '');
    return cleaned || 'autowatering';
}

function buildAppReturnUrl(pathWithSearch: string): string {
    const scheme = normalizeAppUrlScheme(APP_URL_SCHEME);
    const normalized = pathWithSearch.startsWith('/') ? pathWithSearch.slice(1) : pathWithSearch;
    return `${scheme}://${normalized}`;
}

function buildPremiumReturnUrls(): { successUrl: string; cancelUrl: string; returnUrl: string } {
    if (Capacitor.isNativePlatform()) {
        return {
            successUrl: buildAppReturnUrl('/premium?checkout=success'),
            cancelUrl: buildAppReturnUrl('/premium?checkout=cancelled'),
            returnUrl: buildAppReturnUrl('/premium')
        };
    }

    const origin = window.location.origin;
    return {
        successUrl: `${origin}/premium?checkout=success`,
        cancelUrl: `${origin}/premium?checkout=cancelled`,
        returnUrl: `${origin}/premium`
    };
}

function readBoolean(value: unknown): boolean {
    if (value === true) return true;
    if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true';
    }
    return false;
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function createUserFromClaims(claims: Record<string, unknown>): AppUser | null {
    const uid = readString(claims.sub) || readString(claims['cognito:username']);
    if (!uid) return null;

    const email = readString(claims.email);
    const displayName = readString(claims.name);
    const photoURL = readString(claims.picture);
    const emailVerified = readBoolean(claims.email_verified);

    return {
        uid,
        email,
        displayName,
        photoURL,
        emailVerified,
        getIdToken: async (forceRefresh = false) => {
            const token = await getCognitoIdToken(forceRefresh);
            if (!token) throw new Error('Login required.');
            return token;
        },
        getIdTokenResult: async (forceRefresh = false) => {
            const nextClaims = await getCognitoIdTokenClaims(forceRefresh);
            return { claims: (nextClaims || {}) as Record<string, unknown> };
        }
    };
}

function defaultProfileFromUser(user: AppUser | null): UserProfileState | null {
    if (!user) return null;
    return {
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        email: user.email || null,
        emailVerified: user.emailVerified === true,
        language: null,
        unitSystem: null,
        theme: null,
        notificationsEnabled: null,
        phone: null,
        company: null,
        country: null,
        createdAt: null,
        lastSignInAt: null,
        updatedAt: null
    };
}

function normalizeProfileState(input: unknown, fallbackUser: AppUser | null): UserProfileState {
    const source = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
    const nested = (source.profile && typeof source.profile === 'object')
        ? source.profile as Record<string, unknown>
        : {};

    const base = defaultProfileFromUser(fallbackUser) || {
        displayName: null,
        photoURL: null,
        email: null,
        emailVerified: false,
        language: null,
        unitSystem: null,
        theme: null,
        notificationsEnabled: null,
        phone: null,
        company: null,
        country: null,
        createdAt: null,
        lastSignInAt: null,
        updatedAt: null
    };

    return {
        displayName: typeof source.displayName === 'string'
            ? source.displayName
            : (typeof nested.displayName === 'string' ? nested.displayName : base.displayName),
        photoURL: typeof source.photoURL === 'string'
            ? source.photoURL
            : (typeof nested.photoURL === 'string' ? nested.photoURL : base.photoURL),
        email: typeof source.email === 'string' ? source.email : base.email,
        emailVerified: source.emailVerified === true || base.emailVerified,
        language: typeof nested.language === 'string' ? nested.language : base.language,
        unitSystem: typeof nested.unitSystem === 'string' ? nested.unitSystem : base.unitSystem,
        theme: typeof nested.theme === 'string' ? nested.theme : base.theme,
        notificationsEnabled: typeof nested.notificationsEnabled === 'boolean' ? nested.notificationsEnabled : base.notificationsEnabled,
        phone: typeof nested.phone === 'string' ? nested.phone : base.phone,
        company: typeof nested.company === 'string' ? nested.company : base.company,
        country: typeof nested.country === 'string' ? nested.country : base.country,
        createdAt: typeof source.createdAt === 'string' ? source.createdAt : base.createdAt,
        lastSignInAt: typeof source.lastSignInAt === 'string' ? source.lastSignInAt : base.lastSignInAt,
        updatedAt: typeof source.updatedAt === 'string'
            ? source.updatedAt
            : (typeof nested.updatedAt === 'string' ? nested.updatedAt : base.updatedAt)
    };
}

function normalizePremiumState(value: unknown): PremiumState {
    const input = (value && typeof value === 'object') ? value as Record<string, unknown> : {};
    return {
        isPremium: input.isPremium === true,
        status: typeof input.status === 'string' ? input.status : null,
        plan: typeof input.plan === 'string' ? input.plan : null,
        currentPeriodEnd: typeof input.currentPeriodEnd === 'string' ? input.currentPeriodEnd : null,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd === true,
        source: typeof input.source === 'string' ? input.source : null
    };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<AppUser | null>(null);
    const [isGuest, setIsGuest] = useState<boolean>(readGuestMode);
    const [premium, setPremium] = useState<PremiumState>(defaultPremiumState);
    const [premiumLoading, setPremiumLoading] = useState<boolean>(false);
    const [profile, setProfile] = useState<UserProfileState | null>(null);
    const [profileLoading, setProfileLoading] = useState<boolean>(false);

    const subscriptionStatusUrl = EXPLICIT_SUBSCRIPTION_STATUS_URL || deriveEndpointFromAiDoctor('subscriptionStatus');
    const checkoutUrl = EXPLICIT_CHECKOUT_URL || deriveEndpointFromAiDoctor('createSubscriptionCheckout');
    const billingPortalUrl = EXPLICIT_BILLING_PORTAL_URL || deriveEndpointFromAiDoctor('createBillingPortalSession');
    const profileGetUrl = EXPLICIT_PROFILE_GET_URL || deriveEndpointFromAiDoctor('getProfile');
    const profileUpdateUrl = EXPLICIT_PROFILE_UPDATE_URL || deriveEndpointFromAiDoctor('updateProfile');
    const userStateGetUrl = EXPLICIT_USER_STATE_GET_URL || deriveEndpointFromAiDoctor('getUserState');
    const userStateSaveUrl = EXPLICIT_USER_STATE_SAVE_URL || deriveEndpointFromAiDoctor('saveUserState');
    const accountDeleteUrl = EXPLICIT_ACCOUNT_DELETE_URL || deriveEndpointFromAiDoctor('deleteMyAccount');

    const refreshAuthUser = useCallback(async (forceRefresh = false): Promise<AppUser | null> => {
        const claims = await getCognitoIdTokenClaims(forceRefresh);
        const nextUser = claims ? createUserFromClaims(claims as Record<string, unknown>) : null;
        setUser(nextUser);
        if (nextUser) {
            persistGuestMode(false);
            setIsGuest(false);
            setProfile((prev) => prev || defaultProfileFromUser(nextUser));
        } else {
            setProfile(null);
        }
        return nextUser;
    }, []);

    useEffect(() => {
        let active = true;

        const bootstrap = async () => {
            if (!isCognitoConfigured) {
                if (active) setLoading(false);
                return;
            }

            try {
                if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
                    const handled = await completeGoogleSignInFromUrl(window.location.search);
                    if (handled) {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('code');
                        url.searchParams.delete('state');
                        url.searchParams.delete('scope');
                        url.searchParams.delete('session_state');
                        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
                    }
                }
            } catch {
                // ignore callback errors and continue with whatever session we have
            }

            await refreshAuthUser(false);
            if (active) setLoading(false);
        };

        void bootstrap();

        return () => {
            active = false;
        };
    }, [refreshAuthUser]);

    const fetchWithAuth = useCallback(async (
        url: string,
        method: 'GET' | 'POST',
        body?: Record<string, unknown>,
        options?: { forceRefresh?: boolean }
    ): Promise<any> => {
        if (!url) {
            throw new Error('Missing backend endpoint URL.');
        }

        const getTokenOrThrow = async (forceRefresh: boolean): Promise<string> => {
            const token = await getCognitoIdToken(forceRefresh);
            if (!token) {
                throw new Error('Login required.');
            }
            return token;
        };

        const doFetch = async (token: string) => {
            try {
                return await fetch(url, {
                    method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...(body ? { 'Content-Type': 'application/json' } : {})
                    },
                    body: body ? JSON.stringify(body) : undefined
                });
            } catch {
                let originHint = url;
                try {
                    originHint = new URL(url).origin;
                } catch {
                    // keep raw url
                }
                throw new Error(`Network error while contacting backend (${originHint}). Check internet/CORS/backend deploy.`);
            }
        };

        let token = await getTokenOrThrow(options?.forceRefresh === true);
        let response = await doFetch(token);

        if (response.status === 401 && options?.forceRefresh !== true) {
            token = await getTokenOrThrow(true);
            response = await doFetch(token);
        }

        const text = await response.text();
        let payload: any = null;
        if (text.length > 0) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = { message: text };
            }
        }

        if (!response.ok) {
            const message = payload?.error?.message
                || payload?.message
                || `HTTP ${response.status}`;
            throw new Error(message);
        }
        return payload;
    }, []);

    const refreshProfile = useCallback(async (): Promise<void> => {
        if (!user) {
            setProfile(null);
            return;
        }

        setProfileLoading(true);
        try {
            if (!profileGetUrl) {
                setProfile(defaultProfileFromUser(user));
                return;
            }
            const payload = await fetchWithAuth(profileGetUrl, 'GET');
            setProfile(normalizeProfileState(payload, user));
        } catch {
            setProfile(defaultProfileFromUser(user));
        } finally {
            setProfileLoading(false);
        }
    }, [fetchWithAuth, profileGetUrl, user]);

    const refreshPremiumStatus = useCallback(async (): Promise<void> => {
        if (!user) {
            setPremium(defaultPremiumState);
            return;
        }

        setPremiumLoading(true);
        let fromClaims: PremiumState = defaultPremiumState;

        try {
            const tokenResult = await user.getIdTokenResult(false);
            const claimPremium = readBoolean(tokenResult.claims.premium)
                || readBoolean(tokenResult.claims['custom:premium']);
            const claimStatus = readString(tokenResult.claims.subscriptionStatus)
                || readString(tokenResult.claims['custom:subscriptionStatus']);

            fromClaims = {
                isPremium: claimPremium,
                status: claimStatus,
                plan: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
                source: 'claims'
            };

            if (!subscriptionStatusUrl) {
                setPremium(fromClaims);
                return;
            }

            const payload = await fetchWithAuth(subscriptionStatusUrl, 'GET');
            if (typeof payload?.uid === 'string' && payload.uid !== user.uid) {
                setPremium(fromClaims);
                return;
            }
            const fromBackend = normalizePremiumState(payload);
            setPremium({
                ...fromBackend,
                source: fromBackend.source || 'backend'
            });
        } catch {
            setPremium({
                ...fromClaims,
                source: fromClaims.source || 'claims'
            });
        } finally {
            setPremiumLoading(false);
        }
    }, [fetchWithAuth, subscriptionStatusUrl, user]);

    useEffect(() => {
        void refreshPremiumStatus();
    }, [refreshPremiumStatus]);

    useEffect(() => {
        void refreshProfile();
    }, [refreshProfile]);

    const signInUser = useCallback(async (email: string, password: string): Promise<void> => {
        if (!isCognitoConfigured) {
            throw new Error('AWS Cognito is not configured.');
        }
        await signInCognito(email.trim(), password);
        await refreshAuthUser(false);
    }, [refreshAuthUser]);

    const signUpUser = useCallback(async (email: string, password: string): Promise<{ userConfirmed: boolean }> => {
        if (!isCognitoConfigured) {
            throw new Error('AWS Cognito is not configured.');
        }

        const result = await signUpCognito(email.trim(), password);
        if (!result.userConfirmed) {
            return { userConfirmed: false };
        }
        await signInCognito(email.trim(), password);
        await refreshAuthUser(false);
        return { userConfirmed: true };
    }, [refreshAuthUser]);

    const confirmSignUp = useCallback(async (email: string, code: string): Promise<void> => {
        if (!isCognitoConfigured) {
            throw new Error('AWS Cognito is not configured.');
        }
        const trimmedEmail = email.trim();
        const trimmedCode = code.trim();
        if (!trimmedEmail || !trimmedCode) {
            throw new Error('Missing confirmation code.');
        }
        await confirmSignUpCognito(trimmedEmail, trimmedCode);
    }, []);

    const resendSignUpCode = useCallback(async (email: string): Promise<void> => {
        if (!isCognitoConfigured) {
            throw new Error('AWS Cognito is not configured.');
        }
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            throw new Error('Missing email.');
        }
        await resendSignUpCodeCognito(trimmedEmail);
    }, []);

    const signInWithGoogle = useCallback(async (): Promise<void> => {
        if (!isGoogleSignInConfigured) {
            throw new Error('Google sign-in nu este configurat in Cognito Hosted UI.');
        }
        await startGoogleSignIn();
    }, []);

    const signOutUser = useCallback(async (): Promise<void> => {
        await signOutCognito();
        persistGuestMode(false);
        setIsGuest(false);
        setUser(null);
        setPremium(defaultPremiumState);
        setProfile(null);
    }, []);

    const continueAsGuest = useCallback(() => {
        persistGuestMode(true);
        setIsGuest(true);
        setPremium(defaultPremiumState);
        setProfile(null);
    }, []);

    const exitGuestMode = useCallback(() => {
        persistGuestMode(false);
        setIsGuest(false);
    }, []);

    const saveProfile = useCallback(async (patch: ProfilePatch): Promise<void> => {
        if (!user) throw new Error('Login required.');

        const safePatch: ProfilePatch = {};
        if (typeof patch.displayName === 'string') safePatch.displayName = patch.displayName.trim();
        if (typeof patch.photoURL === 'string') safePatch.photoURL = patch.photoURL.trim();
        if (typeof patch.language === 'string') safePatch.language = patch.language.trim();
        if (typeof patch.unitSystem === 'string') safePatch.unitSystem = patch.unitSystem.trim();
        if (typeof patch.theme === 'string') safePatch.theme = patch.theme.trim();
        if (typeof patch.phone === 'string') safePatch.phone = patch.phone.trim();
        if (typeof patch.company === 'string') safePatch.company = patch.company.trim();
        if (typeof patch.country === 'string') safePatch.country = patch.country.trim();
        if (typeof patch.notificationsEnabled === 'boolean') safePatch.notificationsEnabled = patch.notificationsEnabled;

        if (!profileUpdateUrl) {
            await refreshProfile();
            return;
        }

        await fetchWithAuth(profileUpdateUrl, 'POST', { profile: safePatch });
        await refreshProfile();
    }, [fetchWithAuth, profileUpdateUrl, refreshProfile, user]);

    const sendVerification = useCallback(async (): Promise<void> => {
        if (!user) throw new Error('Login required.');
        await sendCognitoEmailVerification();
    }, [user]);

    const changePasswordForCurrentUser = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
        if (!user || !user.email) throw new Error('Login required.');
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            throw new Error('Please provide current password and a new password (min 6 chars).');
        }
        await changeCognitoPassword(currentPassword, newPassword);
    }, [user]);

    const deleteCurrentAccount = useCallback(async (currentPassword: string): Promise<void> => {
        if (!user || !user.email) throw new Error('Login required.');
        if (!currentPassword) throw new Error('Current password is required.');

        if (!accountDeleteUrl) {
            throw new Error('Account delete endpoint is not configured.');
        }

        // Re-authenticate before destructive action.
        await signInCognito(user.email, currentPassword);
        await refreshAuthUser(false);

        await fetchWithAuth(accountDeleteUrl, 'POST', {
            confirmText: 'DELETE'
        }, { forceRefresh: true });

        await signOutCognito();
        persistGuestMode(false);
        setUser(null);
        setIsGuest(false);
        setPremium(defaultPremiumState);
        setProfile(null);
    }, [accountDeleteUrl, fetchWithAuth, refreshAuthUser, user]);

    const loadCloudState = useCallback(async (): Promise<Record<string, unknown> | null> => {
        if (!user) throw new Error('Login required.');
        if (!userStateGetUrl) throw new Error('Cloud state endpoint is not configured.');
        const payload = await fetchWithAuth(userStateGetUrl, 'GET');
        const state = payload?.state;
        return (state && typeof state === 'object') ? state as Record<string, unknown> : null;
    }, [fetchWithAuth, user, userStateGetUrl]);

    const saveCloudState = useCallback(async (state: Record<string, unknown>, version = 'v1'): Promise<void> => {
        if (!user) throw new Error('Login required.');
        if (!userStateSaveUrl) throw new Error('Cloud state endpoint is not configured.');
        await fetchWithAuth(userStateSaveUrl, 'POST', {
            state,
            version
        });
    }, [fetchWithAuth, user, userStateSaveUrl]);

    const startPremiumCheckout = useCallback(async (): Promise<string> => {
        if (!checkoutUrl) {
            throw new Error('Checkout endpoint is not configured.');
        }

        const returnUrls = buildPremiumReturnUrls();
        const payload = await fetchWithAuth(checkoutUrl, 'POST', {
            successUrl: returnUrls.successUrl,
            cancelUrl: returnUrls.cancelUrl
        });

        const redirectUrl = typeof payload?.url === 'string' ? payload.url : '';
        if (!redirectUrl) {
            throw new Error('Checkout URL missing from backend response.');
        }
        return redirectUrl;
    }, [checkoutUrl, fetchWithAuth]);

    const openBillingPortal = useCallback(async (): Promise<string> => {
        if (!billingPortalUrl) {
            throw new Error('Billing portal endpoint is not configured.');
        }

        const returnUrls = buildPremiumReturnUrls();
        const payload = await fetchWithAuth(billingPortalUrl, 'POST', {
            returnUrl: returnUrls.returnUrl
        });

        const redirectUrl = typeof payload?.url === 'string' ? payload.url : '';
        if (!redirectUrl) {
            throw new Error('Billing portal URL missing from backend response.');
        }
        return redirectUrl;
    }, [billingPortalUrl, fetchWithAuth]);

    const value = useMemo<AuthContextValue>(() => ({
        authConfigured: isCognitoConfigured,
        loading,
        user,
        isGuest,
        isAuthenticated: Boolean(user),
        premium,
        premiumLoading,
        profile,
        profileLoading,
        signInUser,
        signUpUser,
        confirmSignUp,
        resendSignUpCode,
        signInWithGoogle,
        signOutUser,
        continueAsGuest,
        exitGuestMode,
        refreshPremiumStatus,
        refreshProfile,
        saveProfile,
        sendVerification,
        changePasswordForCurrentUser,
        deleteCurrentAccount,
        loadCloudState,
        saveCloudState,
        startPremiumCheckout,
        openBillingPortal
    }), [
        changePasswordForCurrentUser,
        continueAsGuest,
        deleteCurrentAccount,
        exitGuestMode,
        loadCloudState,
        loading,
        openBillingPortal,
        profile,
        profileLoading,
        premium,
        premiumLoading,
        refreshProfile,
        refreshPremiumStatus,
        saveCloudState,
        saveProfile,
        sendVerification,
        signInWithGoogle,
        signInUser,
        signOutUser,
        signUpUser,
        confirmSignUp,
        resendSignUpCode,
        startPremiumCheckout,
        user,
        isGuest
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
