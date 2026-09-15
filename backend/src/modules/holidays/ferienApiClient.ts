import { fetchWithRetry } from "../../lib/fetchWithRetry.js";

export interface FerienEntry {
  start: string;
  end: string;
  year: number;
  stateCode: string;
  name: string;
  slug: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { data: FerienEntry[]; expiresAt: number }>();

export async function fetchSchoolHolidays(
  federalState: string,
  year: number,
): Promise<FerienEntry[]> {
  const cacheKey = `${federalState}:${year}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const res = await fetchWithRetry(
    `https://ferien-api.de/api/v1/holidays/${federalState}/${year}`,
  );

  if (res.status === 429) {
    throw new Error(
      "ferien-api.de ist aktuell überlastet (Rate-Limit) – bitte in ein paar Minuten erneut versuchen.",
    );
  }
  if (!res.ok) {
    throw new Error(`ferien-api.de antwortete mit Status ${res.status}`);
  }

  const data = (await res.json()) as FerienEntry[];
  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
