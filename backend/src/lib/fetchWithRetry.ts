export interface FetchWithRetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  { retries = 2, baseDelayMs = 800 }: FetchWithRetryOptions = {},
): Promise<Response> {
  let res = await fetch(url);

  for (let attempt = 0; attempt < retries && res.status === 429; attempt++) {
    const retryAfterHeader = res.headers.get("retry-after");
    const delay = retryAfterHeader ? Number(retryAfterHeader) * 1000 : baseDelayMs * 2 ** attempt;
    await sleep(delay);
    res = await fetch(url);
  }

  return res;
}
