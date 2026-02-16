import { getCognitoIdToken } from '../lib/cognitoClient';

export interface PlantIdRequest {
    image: File;
    latitude?: number;
    longitude?: number;
}

export interface PlantIdCandidate {
    plant_id?: number | string;
    id?: number | string;
    scientific_name?: string;
    scientificName?: string;
    canonical_name?: string;
    canonicalName?: string;
    gbif_key?: number | string;
    gbifKey?: number | string;
    probability?: number;
}

export interface PlantIdResponse {
    provider?: string;
    best_match?: PlantIdCandidate | null;
    match?: PlantIdCandidate | null;
    suggestions?: PlantIdCandidate[];
    proxy_timestamp?: string;
}

const EXPLICIT_PLANT_ID_URL = (import.meta.env.VITE_PLANT_ID_API_URL as string | undefined)?.trim() || '';
const AI_DOCTOR_URL = (import.meta.env.VITE_AI_DOCTOR_API_URL as string | undefined)?.trim() || '';

function derivePlantIdUrlFromAiDoctorUrl(aiDoctorUrl: string): string | null {
    const url = aiDoctorUrl.trim();
    if (!url) return null;

    if (url.endsWith('/aiDoctor')) {
        return `${url.slice(0, -'/aiDoctor'.length)}/plantId`;
    }
    if (url.endsWith('/aiDoctor/')) {
        return `${url.slice(0, -'/aiDoctor/'.length)}/plantId`;
    }

    return null;
}

export class PlantIdService {
    private static instance: PlantIdService;

    public static getInstance(): PlantIdService {
        if (!PlantIdService.instance) {
            PlantIdService.instance = new PlantIdService();
        }
        return PlantIdService.instance;
    }

    public getEndpoint(): string | null {
        if (EXPLICIT_PLANT_ID_URL) return EXPLICIT_PLANT_ID_URL;
        return derivePlantIdUrlFromAiDoctorUrl(AI_DOCTOR_URL);
    }

    public getMissingConfigReason(): string {
        return 'Set VITE_PLANT_ID_API_URL or VITE_AI_DOCTOR_API_URL.';
    }

    public async identify(request: PlantIdRequest): Promise<PlantIdResponse> {
        const endpoint = this.getEndpoint();
        if (!endpoint) {
            throw new Error(this.getMissingConfigReason());
        }

        let token = await this.getAuthIdToken(false);
        if (!token) {
            throw new Error('Login required.');
        }

        const formData = new FormData();
        formData.append('image', request.image);
        if (typeof request.latitude === 'number') {
            formData.append('latitude', String(request.latitude));
        }
        if (typeof request.longitude === 'number') {
            formData.append('longitude', String(request.longitude));
        }

        const doFetch = (idToken: string) => fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${idToken}`,
            },
            body: formData,
        });

        let response = await doFetch(token);
        if (response.status === 401) {
            const refreshed = await this.getAuthIdToken(true);
            if (refreshed) {
                token = refreshed;
                response = await doFetch(token);
            }
        }
        if (!response.ok) {
            const text = await response.text();
            let message = `Plant ID error: HTTP ${response.status}`;
            if (text) {
                try {
                    const parsed = JSON.parse(text) as any;
                    message = parsed?.error?.message || parsed?.message || message;
                } catch {
                    message = text;
                }
            }
            throw new Error(message);
        }

        return response.json() as Promise<PlantIdResponse>;
    }

    private async getAuthIdToken(forceRefresh: boolean): Promise<string | null> {
        try {
            const token = await getCognitoIdToken(forceRefresh);
            return token && token.trim().length > 0 ? token.trim() : null;
        } catch {
            // ignore
        }

        return null;
    }
}

export const plantIdService = PlantIdService.getInstance();
