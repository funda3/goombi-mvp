import { useState } from "react";

const KEY = "goombi_favourites";

function load(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? (stored as string[]) : []);
  } catch {
    return new Set();
  }
}

function persist(ids: Set<string>): void {
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function useFavourites() {
  const [ids, setIds] = useState<Set<string>>(load);

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }

  return {
    ids,
    isFavourite: (id: string) => ids.has(id),
    toggle,
    count: ids.size,
  };
}
