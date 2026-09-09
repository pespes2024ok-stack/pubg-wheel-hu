import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api";

export function useBackgrounds() {
  return useQuery({ queryKey: ["backgrounds"], queryFn: () => api.get("/backgrounds"), staleTime: 60000 });
}

export function pickBackground(list: any[] | undefined, target: string, fallback?: string): string {
  const match = (list || []).find((b) => b.target === target && b.image);
  if (match) return match.image;
  const general = (list || []).find((b) => b.target === "general" && b.image);
  if (general) return general.image;
  return fallback || "";
}
