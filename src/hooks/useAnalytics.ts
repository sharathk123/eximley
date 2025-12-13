/**
 * useAnalytics Hook
 * Reusable hook for fetching analytics data
 */

import { useEffect, useState } from 'react';

interface UseAnalyticsResult<T> {
    stats: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useAnalytics<T>(endpoint: string): UseAnalyticsResult<T> {
    const [stats, setStats] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(endpoint);

            if (!res.ok) {
                throw new Error(`Failed to fetch analytics: ${res.statusText}`);
            }

            const data = await res.json();
            setStats(data.stats);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [endpoint]);

    return {
        stats,
        loading,
        error,
        refetch: fetchStats,
    };
}
