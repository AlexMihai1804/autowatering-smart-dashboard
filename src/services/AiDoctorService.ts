import { getCognitoIdToken } from '../lib/cognitoClient';

export interface AiDoctorRequest {
    image: File;
    symptoms?: string;
    latitude?: number;
    longitude?: number;
    language?: string;
}

export interface AiDoctorDiseaseSuggestion {
    id?: string;
    name: string;
    probability: number;
}

export interface AiDoctorResult {
    provider: 'proxy';
    accessToken?: string;
    isHealthy: boolean | null;
    plantName: string | null;
    plantProbability: number | null;
    diseases: AiDoctorDiseaseSuggestion[];
    llmAdvice: string | null;
    followUpQuestion: string | null;
    raw: unknown;
}

const AI_DOCTOR_PROXY_URL = (import.meta.env.VITE_AI_DOCTOR_API_URL as string | undefined)?.trim() || '';

export class AiDoctorService {
    private static instance: AiDoctorService;

    public static getInstance(): AiDoctorService {
        if (!AiDoctorService.instance) {
            AiDoctorService.instance = new AiDoctorService();
        }
        return AiDoctorService.instance;
    }

    public getProviderName(): 'proxy' | null {
        return AI_DOCTOR_PROXY_URL ? 'proxy' : null;
    }

    public getMissingConfigReason(): string {
        return 'Set VITE_AI_DOCTOR_API_URL.';
    }

    public async diagnose(request: AiDoctorRequest): Promise<AiDoctorResult> {
        if (!AI_DOCTOR_PROXY_URL) {
            throw new Error(this.getMissingConfigReason());
        }
        return this.diagnoseViaProxy(request);
    }

    private async diagnoseViaProxy(request: AiDoctorRequest): Promise<AiDoctorResult> {
        const formData = new FormData();
        formData.append('image', request.image);
        if (request.symptoms?.trim()) {
            formData.append('symptoms', request.symptoms.trim());
        }
        if (typeof request.latitude === 'number') {
            formData.append('latitude', String(request.latitude));
        }
        if (typeof request.longitude === 'number') {
            formData.append('longitude', String(request.longitude));
        }
        if (request.language) {
            formData.append('language', request.language);
        }

        let token = await this.getAuthIdToken(false);
        if (!token) {
            throw new Error('Login required.');
        }

        const doFetch = (idToken: string) => fetch(AI_DOCTOR_PROXY_URL, {
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
            let message = `AI Doctor proxy error: HTTP ${response.status}`;
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

        const raw = await response.json() as any;
        const diseases = this.normalizeDiseaseSuggestions(
            raw?.diseases ?? raw?.result?.disease?.suggestions ?? []
        );
        return {
            provider: 'proxy',
            accessToken: raw?.access_token ?? raw?.accessToken,
            isHealthy: this.normalizeBoolean(raw?.is_healthy ?? raw?.result?.is_healthy),
            plantName: this.normalizePlantName(raw),
            plantProbability: this.normalizePlantProbability(raw),
            diseases,
            llmAdvice: this.normalizeAdvice(raw),
            followUpQuestion: this.normalizeFollowUpQuestion(raw),
            raw,
        };
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

    private normalizeBoolean(value: unknown): boolean | null {
        if (typeof value === 'boolean') return value;
        if (value && typeof value === 'object' && typeof (value as any).binary === 'boolean') return (value as any).binary;
        return null;
    }

    private normalizePlantName(raw: any): string | null {
        const suggestion = raw?.result?.classification?.suggestions?.[0];
        return typeof suggestion?.name === 'string' ? suggestion.name : null;
    }

    private normalizePlantProbability(raw: any): number | null {
        const suggestion = raw?.result?.classification?.suggestions?.[0];
        const probability = suggestion?.probability;
        return typeof probability === 'number' ? probability : null;
    }

    private normalizeAdvice(raw: any): string | null {
        if (typeof raw?.llm_advice === 'string') return raw.llm_advice;
        if (typeof raw?.advice === 'string') return raw.advice;
        if (typeof raw?.summary === 'string') return raw.summary;
        return null;
    }

    private normalizeFollowUpQuestion(raw: any): string | null {
        const question = raw?.result?.disease?.question?.text;
        return typeof question === 'string' ? question : null;
    }

    private normalizeDiseaseSuggestions(suggestions: unknown): AiDoctorDiseaseSuggestion[] {
        if (!Array.isArray(suggestions)) return [];
        return suggestions
            .map((item: any) => ({
                id: typeof item?.id === 'string' ? item.id : undefined,
                name: typeof item?.name === 'string' ? item.name : 'Unknown',
                probability: typeof item?.probability === 'number' ? item.probability : 0,
            }))
            .filter((item) => !!item.name)
            .sort((a, b) => b.probability - a.probability);
    }
}

export const aiDoctorService = AiDoctorService.getInstance();
