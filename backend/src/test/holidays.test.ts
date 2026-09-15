import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app, registerUser } from "./helpers.js";

const mockPublicHolidays = [
  {
    date: "2026-01-01",
    localName: "Neujahr",
    name: "New Year",
    countryCode: "DE",
    fixed: true,
    global: true,
    counties: null,
    launchYear: null,
    types: ["Public"],
  },
  {
    date: "2026-01-06",
    localName: "Heilige Drei Könige",
    name: "Epiphany",
    countryCode: "DE",
    fixed: true,
    global: false,
    counties: ["DE-BW", "DE-BY"],
    launchYear: null,
    types: ["Public"],
  },
  {
    date: "2026-03-08",
    localName: "Frauentag",
    name: "Women's Day",
    countryCode: "DE",
    fixed: true,
    global: false,
    counties: ["DE-BE"],
    launchYear: null,
    types: ["Public"],
  },
];

const mockSchoolHolidays = [
  {
    start: "2026-07-30",
    end: "2026-09-13",
    year: 2026,
    stateCode: "BW",
    name: "Sommerferien",
    slug: "sommerferien-2026-bw",
  },
];

describe("Holiday import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters county-specific public holidays and dedupes on re-import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("date.nager.at")) {
          return new Response(JSON.stringify(mockPublicHolidays), { status: 200 });
        }
        if (url.includes("ferien-api.de")) {
          return new Response(JSON.stringify(mockSchoolHolidays), { status: 200 });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const firstImport = await request(app)
      .post("/api/calendar-events/import-holidays")
      .set(headers)
      .send({ year: 2026, federalState: "BW" });

    expect(firstImport.status).toBe(200);
    // Neujahr (global) + Heilige Drei Könige (BW enthalten) + Sommerferien = 3.
    // Frauentag ist nur für Berlin (BE) und muss herausgefiltert werden.
    expect(firstImport.body.imported).toBe(3);
    expect(firstImport.body.errors).toEqual([]);

    const events = await request(app)
      .get("/api/calendar-events?from=2026-01-01&to=2026-12-31")
      .set(headers);
    const titles = events.body.map((e: { title: string }) => e.title);
    expect(titles).toContain("Neujahr");
    expect(titles).toContain("Heilige Drei Könige");
    expect(titles).toContain("Sommerferien");
    expect(titles).not.toContain("Frauentag");

    const secondImport = await request(app)
      .post("/api/calendar-events/import-holidays")
      .set(headers)
      .send({ year: 2026, federalState: "BW" });

    expect(secondImport.body.imported).toBe(0);
    expect(secondImport.body.updated).toBe(0);
    expect(secondImport.body.skipped).toBe(3);
  });

  it("reports a source error without failing the whole import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("date.nager.at")) {
          return new Response("Internal error", { status: 500 });
        }
        return new Response(JSON.stringify(mockSchoolHolidays), { status: 200 });
      }),
    );

    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const res = await request(app)
      .post("/api/calendar-events/import-holidays")
      .set(headers)
      .send({ year: 2027, federalState: "BW" });

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.errors.length).toBe(1);
  });

  it("reports a friendly rate-limit message when ferien-api.de returns 429 repeatedly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("date.nager.at")) {
          return new Response(JSON.stringify(mockPublicHolidays), { status: 200 });
        }
        return new Response("Too Many Requests", { status: 429 });
      }),
    );

    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const res = await request(app)
      .post("/api/calendar-events/import-holidays")
      .set(headers)
      .send({ year: 2099, federalState: "BW" });

    expect(res.status).toBe(200);
    expect(res.body.errors.some((e: string) => e.includes("Rate-Limit"))).toBe(true);
  }, 10000);

  it("retries once on a transient 429 and succeeds", async () => {
    let ferienCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("date.nager.at")) {
          return new Response(JSON.stringify(mockPublicHolidays), { status: 200 });
        }
        ferienCalls += 1;
        if (ferienCalls === 1) {
          return new Response("Too Many Requests", { status: 429 });
        }
        return new Response(JSON.stringify(mockSchoolHolidays), { status: 200 });
      }),
    );

    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const res = await request(app)
      .post("/api/calendar-events/import-holidays")
      .set(headers)
      .send({ year: 2098, federalState: "BW" });

    expect(res.status).toBe(200);
    expect(res.body.errors).toEqual([]);
    expect(ferienCalls).toBe(2);
  }, 10000);
});
