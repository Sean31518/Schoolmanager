import { prisma } from "../../lib/prisma.js";
import { parentPath } from "../dav/davPath.js";
import { heftName } from "../links/links.service.js";

const RESULTS_PER_CATEGORY = 8;
const MIN_QUERY_LENGTH = 2;

export type SearchResultType = "subject" | "heft" | "homework" | "calendarEvent" | "generalNote";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export async function search(userId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const [subjects, hefte, homework, events, generalNotes] = await Promise.all([
    prisma.subject.findMany({
      where: { userId, name: { contains: q } },
      take: RESULTS_PER_CATEGORY,
    }),
    // Matches the folder path too, so "Q1" finds every Heft in that folder.
    prisma.davFile.findMany({
      where: { userId, kind: "PDF", archived: false, path: { contains: q } },
      orderBy: { modifiedAt: "desc" },
      take: RESULTS_PER_CATEGORY,
    }),
    prisma.homework.findMany({
      where: { userId, title: { contains: q } },
      include: { subject: true },
      take: RESULTS_PER_CATEGORY,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, title: { contains: q } },
      include: { subject: true },
      take: RESULTS_PER_CATEGORY,
    }),
    prisma.generalNote.findMany({
      where: { userId, OR: [{ title: { contains: q } }, { contentJson: { contains: q } }] },
      take: RESULTS_PER_CATEGORY,
    }),
  ]);

  const results: SearchResult[] = [];

  for (const subject of subjects) {
    results.push({
      type: "subject",
      id: subject.id,
      title: subject.name,
      url: `/subjects/${subject.id}`,
    });
  }

  for (const file of hefte) {
    results.push({
      type: "heft",
      id: file.id,
      title: heftName(file.path),
      subtitle: parentPath(file.path),
      url: `/hefte/${file.id}`,
    });
  }

  for (const hw of homework) {
    results.push({
      type: "homework",
      id: hw.id,
      title: hw.title,
      subtitle: hw.subject?.name,
      url: "/",
    });
  }

  for (const event of events) {
    results.push({
      type: "calendarEvent",
      id: event.id,
      title: event.title,
      subtitle: event.subject?.name,
      url: "/calendar",
    });
  }

  for (const note of generalNotes) {
    if (!note.title) continue; // untitled notes have nothing useful to show as a result label
    results.push({ type: "generalNote", id: note.id, title: note.title, url: "/" });
  }

  return results;
}
