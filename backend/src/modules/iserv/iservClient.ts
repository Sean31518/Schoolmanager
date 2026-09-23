/**
 * IServ client for the "dieschulapp" API, which several IServ instances
 * (confirmed live against sk-bw.de, 2026-09) use instead of the older
 * /iserv/timetable/data endpoint the original reference implementation
 * (github.com/Lasse-Tom-Lang/iserv-timetable) targeted.
 *
 * Two things are different from that reference project:
 *
 * 1. Login is a full OIDC authorization-code flow. Its `state` parameter is
 *    a JWT signed by IServ itself (confirmed by decoding one from a live
 *    browser session - alg ES256, iss https://<host>/iserv/, with exp/nbf
 *    claims) - not something a client is free to invent, which an earlier
 *    version of this file tried to do by self-constructing the whole
 *    authorize URL with a random UUID as state. That's why login() instead
 *    starts at plain https://<host>/iserv/ and follows every redirect (a
 *    real browser's own network trace confirmed IServ's server-side
 *    redirect chain - iserv/ -> auth/auth?...&state=<signed-jwt> - mints
 *    this token itself before the OIDC dance even starts) rather than
 *    constructing any OIDC parameters itself. A real browser also follows a
 *    chain of further redirects to complete the flow after that; login()
 *    replicates that by following redirects manually and merging cookies at
 *    every hop, the same way a browser would.
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
 *
 * convertEntry() also reads teacher name/acronym, course name, and the
 * period's own start/end time from the base (non-substituted) entry, for
 * the Stundenplan detail view - these are NOT re-derived from a
 * substitution's own data even when one exists, since that shape is
 * unconfirmed (see detectChange).
 */

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
  substitutionTeacherName?: string;
  substitutionTeacherAcronym?: string;
}

export interface IServPeriod {
  period: number;
  label: string | null;
  subject: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  teacherName: string | null;
  teacherAcronym: string | null;
  courseName: string | null;
  change: IServChangeInfo | null;
}

export class IServAuthError extends Error {}
export class IServRequestError extends Error {}

function normalizeHost(host: string): string {
  return host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
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

interface LoginHop {
  method: string;
  path: string;
  status: number;
  hasLocation: boolean;
  cookieNames: string[];
}

function formatTrace(trace: LoginHop[]): string {
  return trace
    .map(
      (h) =>
        `${h.method} ${h.path}->${h.status}${h.hasLocation ? "" : "(end)"}[cookies:${h.cookieNames.join(",")}]`,
    )
    .join(" | ");
}

/** Extracts the target URL from a <meta http-equiv="refresh"> tag, decoding
 * the HTML entities IServ encodes its query string with (e.g. &amp;). */
function extractMetaRefreshUrl(html: string): string | null {
  const match = html.match(
    /<meta[^>]+http-equiv=["']refresh["'][^>]*content=["']\s*\d+\s*;\s*url=([^"']+)["']/i,
  );
  return match ? match[1].replace(/&amp;/g, "&") : null;
}

export interface LoginResult {
  cookieHeader: string;
  trace: string;
}

/** Follows IServ's OIDC login redirect chain exactly like a browser would:
 * GET-follow every redirect, merging cookies at each hop, until the login
 * form's URL is reached, then POST credentials there and keep following the
 * rest of the chain (through the auth code exchange) until it ends.
 *
 * Symfony's login failure path (wrong credentials) also redirects - usually
 * back to the same login URL to re-render it with an error - so a redirect
 * response right after the POST does NOT by itself mean success. The only
 * reliable signal is where the chain ends up: if the final page (the first
 * one with no further Location header) is still /iserv/auth/login, the
 * login was rejected, no matter how many redirects happened in between. */
async function login(host: string, username: string, password: string): Promise<LoginResult> {
  const jar = new Map<string, string>();
  // Starting at the app root, not a self-built OIDC authorize URL - IServ's
  // own server-side redirect chain from here mints the properly-signed
  // state token, which a client can't construct itself (see module docblock).
  let url = `https://${host}/iserv/`;
  let credentialsSent = false;
  const trace: LoginHop[] = [];

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
    const location = res.headers.get("location");
    trace.push({
      method: shouldPostCredentials ? "POST" : "GET",
      // Full path+query, not just pathname - OAuth2 error redirects
      // conventionally carry the actual reason as ?error=...&error_description=...
      // on the URL itself, which pathname-only logging was silently discarding.
      path: target.pathname + target.search,
      status: res.status,
      hasLocation: Boolean(location),
      cookieNames: Array.from(jar.keys()),
    });
    if (shouldPostCredentials) credentialsSent = true;

    if (!location) {
      if (target.pathname === "/iserv/auth/login") {
        throw new IServAuthError(
          `IServ hat die Zugangsdaten abgelehnt (Login-Formular erneut angezeigt). Benutzername/Passwort prüfen. Ablauf: ${formatTrace(trace)}`,
        );
      }
      if (!credentialsSent) {
        throw new IServAuthError(
          `IServ hat vor dem Login-Formular keine Weiterleitung geliefert - unerwarteter Login-Ablauf für diese IServ-Instanz. Ablauf: ${formatTrace(trace)}`,
        );
      }
      if (target.pathname.startsWith("/iserv/auth/") && res.ok) {
        // A 2xx landing inside /iserv/auth/ with no Location header is a
        // client-side continuation, not a dead end - confirmed live to be a
        // <meta http-equiv="refresh" content="0;url=..."> page finishing the
        // OIDC code exchange, which a real browser follows automatically but
        // fetch() never does since it doesn't parse HTML. Follow it manually;
        // only give up if the page turns out not to have one after all.
        const body = await res.text().catch(() => "");
        const metaRefreshUrl = extractMetaRefreshUrl(body);
        if (metaRefreshUrl) {
          url = new URL(metaRefreshUrl, url).toString();
          continue;
        }
        const snippet = body.replace(/\s+/g, " ").slice(0, 1000);
        throw new IServAuthError(
          `IServ-Login hat sich innerhalb von /iserv/auth/ festgefahren (keine Weiterleitung und kein meta-refresh gefunden). Ablauf: ${formatTrace(trace)} - Seiteninhalt (gekürzt): ${snippet}`,
        );
      }
      if (!res.ok) {
        // The chain ended on an error page (e.g. the OIDC code exchange at
        // /iserv/app/authentication/redirect bouncing to .../error) - this is
        // not a successful login, whatever the path. Capture the body since
        // it may explain why (invalid_state, session mismatch, etc.).
        const snippet = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 1000);
        throw new IServAuthError(
          `IServ-Login endete auf einer Fehlerseite (HTTP ${res.status}). Ablauf: ${formatTrace(trace)} - Seiteninhalt (gekürzt): ${snippet}`,
        );
      }
      return { cookieHeader: cookieHeaderFromJar(jar), trace: formatTrace(trace) };
    }
    url = new URL(location, url).toString();
  }

  throw new IServAuthError(
    `IServ-Login: zu viele Weiterleitungen, Anmeldung nicht abgeschlossen. Ablauf: ${formatTrace(trace)}`,
  );
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

interface DieSchulAppTeacher {
  forename?: string;
  surname?: string;
  displayname?: string;
  externalId?: string;
}

interface DieSchulAppEntry {
  weekday: number;
  timeTableSlot?: { number?: number; startTime?: string; endTime?: string; name?: string };
  courseSubject?: {
    subject?: { name?: string; acronym?: string };
    course?: { name?: string };
    teachers?: DieSchulAppTeacher[];
    type?: string;
  } | null;
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
  loginTrace: string,
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
    // login() already verified the chain didn't end back on the login form,
    // so a 401 here means the resulting session simply isn't accepted by
    // this specific API - include the login trace since that's otherwise
    // invisible once we get this far.
    const b = body as { message?: string } | null;
    throw new IServAuthError(
      `IServ hat den Stundenplan-Abruf abgelehnt (HTTP ${res.status}${b?.message ? `: ${b.message}` : ""}). Login-Ablauf: ${loginTrace}`,
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

/** Joins multiple teachers (team teaching) with a comma; null if there are
 * none rather than an empty string, so the UI can cleanly omit the field. */
function joinTeachers(teachers: DieSchulAppTeacher[], pick: (t: DieSchulAppTeacher) => string | undefined) {
  const names = teachers.map(pick).filter((n): n is string => Boolean(n));
  return names.length ? names.join(", ") : null;
}

/** Best-effort substitution detection - see the module docblock's caveat.
 * Only fires on the presence of specific fields, so a wrong guess about
 * their names just means no override is created (or a substitute
 * room/teacher silently missing), never a false positive on a normal
 * lesson. The substitute-teacher guess mirrors the base entry's own
 * courseSubject.teachers shape, since a substitution swapping the teacher
 * is the most plausible place IServ would reuse that same shape. */
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
    const subTeachers = sub.teachers as DieSchulAppTeacher[] | undefined;
    return {
      changeTypes: ["1"],
      substitutionSubject:
        (subSubject?.acronym as string) ||
        (subSubject?.name as string) ||
        (sub.subjectName as string) ||
        undefined,
      substitutionRoom: (subRoom?.name as string) || (sub.roomName as string) || undefined,
      substitutionTeacherName: Array.isArray(subTeachers)
        ? (joinTeachers(subTeachers, (t) => t.displayname || [t.forename, t.surname].filter(Boolean).join(" ")) ??
          undefined)
        : undefined,
      substitutionTeacherAcronym: Array.isArray(subTeachers)
        ? (joinTeachers(subTeachers, (t) => t.externalId) ?? undefined)
        : undefined,
    };
  }
  return null;
}

function convertEntry(raw: DieSchulAppEntry): IServPeriod {
  const subject = raw.courseSubject?.subject;
  const teachers = raw.courseSubject?.teachers ?? [];
  return {
    period: raw.timeTableSlot?.number ?? 0,
    label: raw.timeTableSlot?.name ?? null,
    subject: subject?.acronym || subject?.name || "",
    room: raw.room?.name ?? "",
    startTime: raw.timeTableSlot?.startTime ?? null,
    endTime: raw.timeTableSlot?.endTime ?? null,
    teacherName: joinTeachers(teachers, (t) => t.displayname || [t.forename, t.surname].filter(Boolean).join(" ")),
    teacherAcronym: joinTeachers(teachers, (t) => t.externalId),
    courseName: raw.courseSubject?.course?.name ?? null,
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
  const { cookieHeader, trace } = await login(host, creds.username, creds.password);

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
      const entries = await fetchWeekTimetable(host, cookieHeader, monday, trace);
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
