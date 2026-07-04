"use client";

import { useState, useEffect } from "react";

/** Pobiera licznik nieprzeczytanych powiadomień bez blokowania nawigacji. */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/unread")
      .then((r) => r.json())
      .then((d: { count?: number }) => {
        if (!cancelled) setCount(d.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
