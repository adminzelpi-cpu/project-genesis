import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'search_history';
const MAX_ITEMS = 10;
const EXPIRATION_DAYS = 30;
const EXPIRATION_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

interface SearchEntry {
  term: string;
  timestamp: number;
}

function migrateOldFormat(stored: string): SearchEntry[] {
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    // Old format was string[], new format is SearchEntry[]
    if (typeof parsed[0] === 'string') {
      return parsed.map((term: string) => ({ term, timestamp: Date.now() }));
    }
    return parsed as SearchEntry[];
  } catch {
    return [];
  }
}

function removeExpired(items: SearchEntry[]): SearchEntry[] {
  const cutoff = Date.now() - EXPIRATION_MS;
  return items.filter(item => item.timestamp > cutoff);
}

export function useSearchHistory(storeId: string | undefined) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!storeId) return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${storeId}`);
      if (stored) {
        let entries = migrateOldFormat(stored);
        entries = removeExpired(entries);
        localStorage.setItem(`${STORAGE_KEY}_${storeId}`, JSON.stringify(entries));
        setHistory(entries.map(e => e.term));
      }
    } catch {}
  }, [storeId]);

  const addTerm = useCallback((term: string) => {
    if (!storeId || !term.trim()) return;
    const trimmed = term.trim().toLowerCase();
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${storeId}`);
      let entries: SearchEntry[] = stored ? migrateOldFormat(stored) : [];
      entries = removeExpired(entries);
      entries = entries.filter(e => e.term !== trimmed);
      entries.unshift({ term: trimmed, timestamp: Date.now() });
      entries = entries.slice(0, MAX_ITEMS);
      localStorage.setItem(`${STORAGE_KEY}_${storeId}`, JSON.stringify(entries));
      setHistory(entries.map(e => e.term));
    } catch {}
  }, [storeId]);

  const clearHistory = useCallback(() => {
    if (!storeId) return;
    localStorage.removeItem(`${STORAGE_KEY}_${storeId}`);
    setHistory([]);
  }, [storeId]);

  return { history, addTerm, clearHistory, hasHistory: history.length > 0 };
}
