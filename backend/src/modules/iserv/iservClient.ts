/**
 * IServ client for the "dieschulapp" API, which several IServ instances
 * (confirmed live against sk-bw.de, 2026-09) use instead of the older
 * /iserv/timetable/data endpoint the original reference implementation
 * (github.com/Lasse-Tom-Lang/iserv-timetable) targeted.
 *
 * Two things are different from that reference project:
 *
 * 1. Login is a full OIDC authorization-code flow (client_id/nonce/
 *    redirect_uri/response_type=code), not a single form POST. A real
 *    browser follows a chain of redirects to complete it; login() below
 *    replicates that by following redirects manually and merging cookies
 *    at every hop, the same way a browser would. DIESCHULAPP_CLIENT_ID and
 *    DIESCHULAPP_SCOPE were read off a live browser session - they look
 *    like fixed properties of the "dieschulapp" app itself rather than
 *    something per-school, but that's an assumption, not a confirmed fact.
 *
 * 2. The timetable endpoint (/iserv/dieschulapp/api/1.0/current-timetable/)
 *    is inherently a *personal* endpoint - it takes an optional
 *    `filterBy=courseSubject.course:in(...)` filter, but omitting it
 *    entirely returns the logged-in user's own enrolled courses. That
 *    naturally solves the "every Oberstufe student has individually chosen
 *    courses" problem without needing any class/course configuration at
 *    all, so schoolClass on IServCredentials is accepted but currently
 *    unused.
 *
 * The endpoint takes `week=true`, returning an entire week's schedule
 * (Monday-Friday, `weekday` 0-4) per request rather than one day at a time.
 *
 * Substitution/cancellation detection (detectChange below) is a best-effort
 * guess at plausible field names - no live example of an actual Vertretung
 * in this API's response has been seen yet, only a week with none active.
 * A wrong guess here just means no override gets created (never a false
 * "cancelled" on a normal lesson), since detectChange only fires on the
 * presence of specific fields that are very unlikely to appear on a normal
 * entry. Needs a real example to confirm/fix.
 */

import { randomUUID } from "node:crypto";

export interface IServCredentials {
  host: string;
  username: string;
  password: string;
  /** Accepted but currently unused - see the module docblock. */
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

// Read off a live browser login to sk-bw.de's IServ - see module docblock.
const DIESCHULAPP_CLIENT_ID = "6be3cd34-d7d9-4206-88f7-037adf5c511b";
const DIESCHULAPP_SCOPE =
  "openid uuid iserv:session-id iserv:web-ui iserv:2fa:configuration iserv:access-groups";

function buildAuthorizeUrl(host: string): string {
  const params = new URLSearchParams({
    _iserv_app_url: "/iserv/",
    client_id: DIESCHULAPP_CLIENT_ID,
    nonce: randomUUID(),
    redirect_uri: `https://${host}/iserv/app/authentication/redirect`,
    response_type: "code",
    scope: DIESCHULAPP_SCOPE,
    state: randomUUID(),
  });
  return `https://${host}/iserv/auth/auth?${params.toString()}`;
}

function mergeCookies(jar: Map<string, string>, headers: Headers): void {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = typeof getSetCookie === "function" ? getSetCookie.call(headers) : [];
  for (const cookie of cookies) {
    const pair = cookie.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeaderFromJar(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

const MAX_LOGIN_REDIRECTS = 15;

/** Follows IServ's OIDC login redirect chain exactly like a browser would:
 * GET-follow every redirect, merging cookies at each hop, until the login
 * form's URL is reached, then POST credentials there and keep following the
 * rest of the chain (through the auth code exchange) until it ends. */
async function login(host: string, username: string, password: string): Promise<string> {
  const jar = new Map<string, string>();
  let url = buildAuthorizeUrl(host);
  let credentialsSent = false;

  for (let hop = 0; hop < MAX_LOGIN_REDIRECTS; hop++) {
    const target = new URL(url);
    const isLoginPage = target.pathname === "/iserv/auth/login";
    const shouldPostCredentials = isLoginPage && !credentialsSent;

    const res = await fetch(url, {
      method: shouldPostCredentials ? "POST" : "GET",
      redirect: "manual",
      headers: {
        Cookie: cookieHeaderFromJar(jar),
        ...(shouldPostCredentials ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: shouldPostCredentials
        ? new URLSearchParams({
            _target_path: target.searchParams.get("_target_path") ?? "",
            _username: username,
            _password: password,
          }).toString()
        : undefined,
    });

    mergeCookies(jar, res.headers);

    if (shouldPostCredentials) {
      credentialsSent = true;
      if (res.status < 300 || res.status >= 400) {
        throw new IServAuthError(
          "IServ hat die Zugangsdaten abgelehnt (Login-Formular kam ohne Weiterleitung zurück). Benutzername/Passwort prüfen.",
        );
      }
    }

    const location = res.headers.get("location");
    if (!location) {
      if (!credentialsSent) {
        throw new IServAuthError(
          "IServ hat vor dem Login-Formular keine Weiterleitung geliefert - unerwarteter Login-Ablauf für diese IServ-Instanz.",
        );
      }
      return cookieHeaderFromJar(jar);
    }
    url = new URL(location, url).toString();
  }

  throw new IServAuthError("IServ-Login: zu viele Weiterleitungen, Anmeldung nicht abgeschlossen.");
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

interface DieSchulAppEntry {
  weekday: number;
  timeTableSlot?: { number?: number; startTime?: string; endTime?: string; name?: string };
  courseSubject?: { subject?: { name?: string; acronym?: string }; type?: string } | null;
  room?: { name?: string } | null;
  [key: string]: unknown;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function fetchWeekTimetable(
  host: string,
  cookieHeader: string,
  monday: Date,
): Promise<DieSchulAppEntry[]> {
  const url = `https://${host}/iserv/dieschulapp/api/1.0/current-timetable/?date=${isoDate(monday)}&week=true&substitutions=true`;
  const res = await fetch(url, { headers: { Cookie: cookieHeader, Accept: "application/json" } });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new IServRequestError("Antwort von IServ (Stundenplan) konnte nicht als JSON gelesen werden.");
  }

  if (!res.ok) {
    // IServ sets a session cookie even for a rejected login, so an invalid
    // session isn't caught until an actual data request like this one comes
    // back 401/403 - report that distinctly from a genuine shape mismatch.
    const b = body as { message?: string } | null;
    throw new IServAuthError(
      `IServ hat den Stundenplan-Abruf abgelehnt (HTTP ${res.status}${b?.message ? `: ${b.message}` : ""}). Login vermutlich nicht abgeschlossen.`,
    );
  }

  const entries = (body as { entries?: unknown[] } | null)?.entries;
  if (!Array.isArray(entries)) {
    // The exact response shape isn't something we can test against ahead of
    // time - surface a truncated dump of what actually came back (this
    // school's own timetable data, not credentials) so it can be read from
    // Settings > IServ and used to fix the parsing.
    const snippet = JSON.stringify(body).slice(0, 500);
    throw new IServRequestError(
      `Unerwartetes Antwortformat vom IServ-Stundenplan-Endpunkt. Rohdaten (gekürzt): ${snippet}`,
    );
  }

  return entries as DieSchulAppEntry[];
}

/** Best-effort substitution detection - see the module docblock's caveat.
 * Only fires on the presence of specific fields, so a wrong guess about
 * their names just means no override is created, never a false positive on
 * a normal lesson. */
function detectChange(raw: DieSchulAppEntry): IServChangeInfo | null {
  if (raw.cancelled === true || raw.courseSubject === null) {
    return { changeTypes: ["0"] };
  }
  const sub = (raw.substitution ?? raw.change) as Record<string, unknown> | undefined;
  if (sub && typeof sub === "object") {
    if (sub.type === "cancelled" || sub.cancelled === true) {
      return { changeTypes: ["0"] };
    }
    const subSubject = sub.subject as Record<string, unknown> | undefined;
    const subRoom = sub.room as Record<string, unknown> | undefined;
    return {
      changeTypes: ["1"],
      substitutionSubject:
        (subSubject?.acronym as string) ||
        (subSubject?.name as string) ||
        (sub.subjectName as string) ||
        undefined,
      substitutionRoom: (subRoom?.name as string) || (sub.roomName as string) || undefined,
    };
  }
  return null;
}

function convertEntry(raw: DieSchulAppEntry): IServPeriod {
  const subject = raw.courseSubject?.subject;
  return {
    period: raw.timeTableSlot?.number ?? 0,
    subject: subject?.acronym || subject?.name || "",
    room: raw.room?.name ?? "",
    change: detectChange(raw),
  };
}

/**
 * Logs in once, fetches one request per distinct week covering the given
 * dates (the API returns a whole Monday-Friday week per call), and always
 * logs out afterward even if a fetch fails partway through.
 */
export async function fetchIServTimetable(
  creds: IServCredentials,
  dates: Date[],
): Promise<Map<string, IServPeriod[]>> {
  const host = normalizeHost(creds.host);
  const cookieHeader = await login(host, creds.username, creds.password);

  const wantedKeys = new Set(dates.map(isoDate));
  const result = new Map<string, IServPeriod[]>();
  for (const key of wantedKeys) result.set(key, []);

  const mondays = new Map<string, Date>();
  for (const date of dates) {
    const monday = mondayOf(date);
    mondays.set(isoDate(monday), monday);
  }

  try {
    for (const monday of mondays.values()) {
      const entries = await fetchWeekTimetable(host, cookieHeader, monday);
      for (const entry of entries) {
        const date = new Date(monday);
        date.setUTCDate(date.getUTCDate() + entry.weekday);
        const dateKey = isoDate(date);
        if (!wantedKeys.has(dateKey)) continue;
        result.get(dateKey)!.push(convertEntry(entry));
      }
    }
  } finally {
    await logout(host, cookieHeader);
  }
  return result;
}
