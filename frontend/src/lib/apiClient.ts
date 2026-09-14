let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface ApiErrorBody {
  error?: { code: string; message: string; details?: unknown };
}

export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseErrorBody(res: Response) {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error ?? { code: "UNKNOWN", message: res.statusText };
  } catch {
    return { code: "UNKNOWN", message: res.statusText };
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

const NO_RETRY_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh"]);

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRetry, ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !skipAuthRetry && !NO_RETRY_PATHS.has(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!res.ok) {
    const error = await parseErrorBody(res);
    throw new ApiRequestError(res.status, error.code, error.message, error.details);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
