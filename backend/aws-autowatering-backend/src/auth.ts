import {
    AdminDeleteUserCommand,
    AdminGetUserCommand,
    AdminUpdateUserAttributesCommand,
    CognitoIdentityProviderClient
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { config } from './config';

export interface AuthenticatedUser {
    uid: string;
    claims: Record<string, unknown>;
}

const cognitoClient = new CognitoIdentityProviderClient({});

const idTokenVerifier = CognitoJwtVerifier.create({
    userPoolId: config.cognitoUserPoolId,
    tokenUse: 'id',
    clientId: config.cognitoAppClientId
});

const accessTokenVerifier = CognitoJwtVerifier.create({
    userPoolId: config.cognitoUserPoolId,
    tokenUse: 'access',
    clientId: config.cognitoAppClientId
});

export function getAuthorizationBearer(headers: Record<string, string | undefined>): string | null {
    const raw = headers.authorization || headers.Authorization;
    if (!raw) return null;
    if (!raw.toLowerCase().startsWith('bearer ')) return null;
    const token = raw.slice(7).trim();
    return token.length > 0 ? token : null;
}

async function verifyToken(token: string): Promise<Record<string, unknown>> {
    try {
        const idClaims = await idTokenVerifier.verify(token);
        return idClaims as Record<string, unknown>;
    } catch {
        const accessClaims = await accessTokenVerifier.verify(token);
        return accessClaims as Record<string, unknown>;
    }
}

export async function requireAuthenticatedUser(headers: Record<string, string | undefined>): Promise<AuthenticatedUser> {
    const bearerToken = getAuthorizationBearer(headers);
    if (!bearerToken) {
        throw Object.assign(new Error('Missing authorization token'), { statusCode: 401, code: 'auth_required' });
    }

    let claims: Record<string, unknown>;
    try {
        claims = await verifyToken(bearerToken);
    } catch {
        throw Object.assign(new Error('Invalid auth token'), { statusCode: 401, code: 'invalid_token' });
    }

    const uid = typeof claims.sub === 'string' && claims.sub.trim().length > 0
        ? claims.sub
        : (typeof claims.username === 'string' ? claims.username : '');
    if (!uid) {
        throw Object.assign(new Error('Token is missing user identifier'), { statusCode: 401, code: 'invalid_token' });
    }

    return { uid, claims };
}

export interface CognitoProfileSnapshot {
    username: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

function attributeMap(attributes: Array<{ Name?: string; Value?: string }> | undefined): Record<string, string> {
    const map: Record<string, string> = {};
    for (const item of attributes || []) {
        if (!item.Name || typeof item.Value !== 'string') continue;
        map[item.Name] = item.Value;
    }
    return map;
}

export async function adminGetProfile(uid: string): Promise<CognitoProfileSnapshot | null> {
    try {
        const out = await cognitoClient.send(new AdminGetUserCommand({
            UserPoolId: config.cognitoUserPoolId,
            Username: uid
        }));
        const attrs = attributeMap(out.UserAttributes);
        return {
            username: out.Username || uid,
            email: attrs.email || null,
            emailVerified: attrs.email_verified === 'true',
            displayName: attrs.name || null,
            photoURL: attrs.picture || null,
            createdAt: out.UserCreateDate ? out.UserCreateDate.toISOString() : null,
            updatedAt: out.UserLastModifiedDate ? out.UserLastModifiedDate.toISOString() : null
        };
    } catch {
        return null;
    }
}

export async function adminUpdateProfileAttributes(uid: string, patch: {
    displayName?: string;
    photoURL?: string;
}): Promise<void> {
    const attributes: Array<{ Name: string; Value: string }> = [];
    if (typeof patch.displayName === 'string' && patch.displayName.trim().length > 0) {
        attributes.push({ Name: 'name', Value: patch.displayName.trim() });
    }
    if (typeof patch.photoURL === 'string' && patch.photoURL.trim().length > 0) {
        attributes.push({ Name: 'picture', Value: patch.photoURL.trim() });
    }
    if (attributes.length === 0) return;

    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: config.cognitoUserPoolId,
        Username: uid,
        UserAttributes: attributes
    }));
}

export async function adminDeleteUser(uid: string): Promise<void> {
    await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: config.cognitoUserPoolId,
        Username: uid
    }));
}
