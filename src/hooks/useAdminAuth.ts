import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';

/**
 * Hook that checks if the current user belongs to the Cognito `admins` group.
 * Returns { isAdmin, loading, refresh }.
 */
export function useAdminAuth() {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const check = useCallback(async () => {
        if (!user) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }
        try {
            const result = await user.getIdTokenResult(false);
            const groups = String(result.claims['cognito:groups'] || '');
            setIsAdmin(groups.split(',').some(g => g.trim() === 'admins' || g.trim() === 'admin'));
        } catch {
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { check(); }, [check]);

    return { isAdmin, loading, refresh: check };
}
