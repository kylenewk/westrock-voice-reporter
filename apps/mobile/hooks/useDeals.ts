import { useState, useCallback, useEffect } from "react";
import * as api from "../services/api";
import type { DealSummary, DealDetail } from "../types";

interface UseDealsReturn {
  deals: DealSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useDeals(): UseDealsReturn {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const search = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      setLastQuery(query);
      const result = await api.searchDeals(query);
      setDeals(result.deals);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message || "Failed to search deals");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (deals.length >= total || loading) return;
    try {
      setLoading(true);
      const result = await api.searchDeals(lastQuery);
      setDeals((prev) => [...prev, ...result.deals]);
    } catch (e: any) {
      setError(e.message || "Failed to load more deals");
    } finally {
      setLoading(false);
    }
  }, [deals.length, total, loading, lastQuery]);

  return { deals, total, loading, error, hasMore: deals.length < total, search, loadMore };
}

interface UseDealDetailReturn {
  deal: DealDetail | null;
  loading: boolean;
  error: string | null;
}

export function useDealDetail(dealId: string | undefined): UseDealDetailReturn {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getDealDetail(dealId);
        if (!cancelled) setDeal(result);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load deal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dealId]);

  return { deal, loading, error };
}
