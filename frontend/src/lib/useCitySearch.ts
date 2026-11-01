"use client";
import { useEffect, useState } from "react";
import { glowApi, message } from "./glow-api";
import type { Location } from "./domain";
export function useCitySearch(query: string) {
  const [results, setResults] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let current = true;
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await glowApi.cities(query);
        if (current) {
          setResults(data.cities);
          setError(null);
        }
      } catch (err) {
        if (current) {
          setError(message(err));
          setResults([]);
        }
      } finally {
        if (current) setLoading(false);
      }
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);
  return { results, error, loading };
}
