export interface BackendConfig {
    usersTable: string;
    rateLimitsTable: string;
    provisioningTable: string;
    serialCounterKey: string;
    factoryProvisionToken: string;
    cognitoUserPoolId: string;
    cognitoAppClientId: string;
    allowedOrigins: string[];
    appBaseUrl: string;
    returnUrlAllowedSchemes: string[];
    returnUrlAllowedOrigins: string[];
    kindwiseApiKey: string;
    kindwiseBaseUrl: string;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    stripeMonthlyPriceId: string;
    requirePremiumForAi: boolean;
    requirePremiumForPlantId: boolean;
    enableConversation: boolean;
    rateLimitSalt: string;
}

function parseList(value: string | undefined, fallback: string[]): string[] {
    if (!value || value.trim().length === 0) return fallback;
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

export const config: BackendConfig = {
    usersTable: process.env.USERS_TABLE?.trim() || '',
    rateLimitsTable: process.env.RATE_LIMITS_TABLE?.trim() || '',
    provisioningTable: process.env.PROVISIONING_TABLE?.trim() || '',
    serialCounterKey: process.env.SERIAL_COUNTER_KEY?.trim() || 'serial_counter',
    factoryProvisionToken: process.env.FACTORY_PROVISION_TOKEN?.trim() || '',
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID?.trim() || '',
    cognitoAppClientId: process.env.COGNITO_APP_CLIENT_ID?.trim() || '',
    allowedOrigins: parseList(process.env.ALLOWED_ORIGINS, ['*']),
    appBaseUrl: process.env.APP_BASE_URL?.trim() || '',
    returnUrlAllowedSchemes: parseList(
        process.env.RETURN_URL_ALLOWED_SCHEMES,
        ['http', 'https', 'autowatering', 'com.autowatering.smartdashboard']
    ),
    returnUrlAllowedOrigins: parseList(
        process.env.RETURN_URL_ALLOWED_ORIGINS,
        ['http://localhost:5173', 'http://localhost', 'https://localhost']
    ),
    kindwiseApiKey: process.env.KINDWISE_API_KEY?.trim() || '',
    kindwiseBaseUrl: (process.env.KINDWISE_BASE_URL?.trim() || 'https://plant.id/api/v3').replace(/\/$/, ''),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim() || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || '',
    stripeMonthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID?.trim() || '',
    requirePremiumForAi: parseBoolean(process.env.REQUIRE_PREMIUM_FOR_AI, false),
    requirePremiumForPlantId: parseBoolean(process.env.REQUIRE_PREMIUM_FOR_PLANT_ID, true),
    enableConversation: parseBoolean(process.env.ENABLE_CONVERSATION, true),
    rateLimitSalt: process.env.RATE_LIMIT_SALT?.trim() || ''
};

export function assertCoreConfig(): void {
    const missing: string[] = [];
    if (!config.usersTable) missing.push('USERS_TABLE');
    if (!config.rateLimitsTable) missing.push('RATE_LIMITS_TABLE');
    if (!config.provisioningTable) missing.push('PROVISIONING_TABLE');
    if (!config.cognitoUserPoolId) missing.push('COGNITO_USER_POOL_ID');
    if (!config.cognitoAppClientId) missing.push('COGNITO_APP_CLIENT_ID');

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
