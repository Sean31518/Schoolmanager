/**
 * Minimal IServ client - logs in with the school's normal web login and
 * reads the same /iserv/timetable/data endpoint the IServ web UI itself
 * uses. Ported from https://github.com/Lasse-Tom-Lang/iserv-timetable
 * (MIT), but returns structured data instead of a pre-formatted HTML
 * string, and surfaces failures with a real message instead of swallowing
 * every error.
 *
 * IServ's timetable endpoint expects a "classes" filter designed for a
 * fixed school class - students with individually chosen courses
 * (Kursstufe/Oberstufe) may not have one that returns their own schedule.
 * schoolClass is therefore optional here; omitting it sends no "classes"
 * filter at all, which may (untested against a real IServ instance) fall
 * back to the logged-in user's own personalized timetable.
 */

export interface IServCredentials {
  host: string;
  username: string;
  password: string;
  schoolClass?: string | null;
}

export interface IServChangeInfo {
  changeTypes: string[];
  substitutionSubject?: string;
  substitutionRoom?: string;
}

export interface IServPeriod {
  period: number;
  subject: string;
  room: string;
  change: IServChangeInfo | null;
}

export class IServAuthError extends Error {}
export class IServRequestError extends Error {}

function normalizeHost(host: string): string {
  return host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function formatDateForIServ(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function collectCookieHeader(headers: Headers): string {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = typeof getSetCookie === "function" ? getSetCookie.call(headers) : [];
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

async function login(host: string, username: string, password: string): Promise<string> {
  const res = await fetch(`https://${host}/iserv/auth/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _username: username, _password: password }).toString(),
  });

  const cookieHeader = collectCookieHeader(res.headers);
  if (!cookieHeader) {
    throw new IServAuthError(
      "IServ hat beim Login kein Session-Cookie gesetzt. Domain, Benutzername oder Passwort prüfen.",
    );
  }
  return cookieHeader;
}

async function logout(host: string, cookieHeader: string): Promise<void> {
  try {
    await fetch(`https://${host}/iserv/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
    });
  } catch {
    // Best-effort session cleanup - not worth failing the sync over.
  }
}

function buildTimetableUrl(host: string, dateStr: string, schoolClass?: string | null): string {
  const filter: Record<string, unknown> = {
    startDate: dateStr,
    endDate: dateStr,
    changesUntil: null,
    teachers: ["%"],
    rooms: ["%"],
  };
  if (schoolClass) {
    filter.classes = [schoolClass];
  }
  return `https://${host}/iserv/timetable/data?filter=${encodeURIComponent(JSON.stringify(filter))}`;
}

function mapPeriod(raw: unknown): IServPeriod {
  const r = raw as Record<string, unknown>;
  const changeRaw = r.change as Record<string, unknown> | undefined;
  const change: IServChangeInfo | null = changeRaw
    ? {
        changeTypes: Array.isArray(changeRaw.change_types)
          ? (changeRaw.change_types as unknown[]).map(String)
          : [],
        substitutionSubject:
          typeof changeRaw.substitutionSubject === "string" ? changeRaw.substitutionSubject : undefined,
        substitutionRoom:
          typeof changeRaw.substitutionRoom === "string" ? changeRaw.substitutionRoom : undefined,
      }
    : null;

  return {
    period: Number(r.period),
    subject: String(r.subject ?? ""),
    room: String(r.room ?? ""),
    change,
  };
}

async function fetchDayTimetable(
  host: string,
  cookieHeader: string,
  date: Date,
  schoolClass?: string | null,
): Promise<IServPeriod[]> {
  const url = buildTimetableUrl(host, formatDateForIServ(date), schoolClass);
  const res = await fetch(url, { headers: { Cookie: cookieHeader, Accept: "application/json" } });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new IServAuthError(
      "IServ hat keine Stundenplan-Daten zurückgegeben - Login vermutlich fehlgeschlagen oder Domain/Klasse falsch.",
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new IServRequestError("Antwort von IServ konnte nicht als JSON gelesen werden.");
  }

  const periods = extractPeriods(body);
  if (!periods) {
    // The exact response shape varies between IServ instances/versions and
    // isn't something we can test against ahead of time - surface a
    // truncated dump of what actually came back (this school's own
    // timetable data, not credentials) so it can be read from
    // Settings > IServ and used to fix the parsing.
    const snippet = JSON.stringify(body).slice(0, 500);
    throw new IServRequestError(
      `Unerwartetes Antwortformat vom IServ-Stundenplan-Endpunkt. Rohdaten (gekürzt): ${snippet}`,
    );
  }

  return periods.map(mapPeriod);
}

/** Tries every response shape known to be plausible for this endpoint
 * before giving up - the reference implementation assumed `data.timetable`,
 * but that may not hold for every IServ version/instance. */
function extractPeriods(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  const b = body as Record<string, unknown> | null;
  if (Array.isArray(b?.timetable)) return b.timetable as unknown[];
  if (Array.isArray(b?.data)) return b.data as unknown[];
  const data = b?.data as Record<string, unknown> | undefined;
  if (Array.isArray(data?.timetable)) return data.timetable as unknown[];
  return null;
}

/**
 * Logs in once, fetches one day at a time for every date given (IServ's
 * response shape for a genuine multi-day range is unverified - fetching
 * day-by-day mirrors the one request shape actually confirmed to work),
 * and always logs out afterward even if a fetch fails partway through.
 */
export async function fetchIServTimetable(
  creds: IServCredentials,
  dates: Date[],
): Promise<Map<string, IServPeriod[]>> {
  const host = normalizeHost(creds.host);
  const cookieHeader = await login(host, creds.username, creds.password);
  const result = new Map<string, IServPeriod[]>();
  try {
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      result.set(key, await fetchDayTimetable(host, cookieHeader, date, creds.schoolClass));
    }
  } finally {
    await logout(host, cookieHeader);
  }
  return result;
}
