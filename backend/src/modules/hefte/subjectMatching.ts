import { baseName, parentPath } from "../dav/davPath.js";

export interface SubjectRef {
  id: string;
  name: string;
}

export type SubjectSource = "folder" | "name" | "manual";

export interface ResolvedSubject {
  subjectId: string | null;
  source: SubjectSource | null;
  /** The folder whose name (or manual assignment) decided it. */
  folderPath: string | null;
}

/** "1 Französisch", "01_Mathe", "2. Deutsch" -> "französisch"/"mathe"/... */
export function normalizeName(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/^[\s\d._-]+/, "")
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase("de-DE");
}

/**
 * Which Fach a Heft belongs to, from its Goodnotes path:
 * 1. walking its folders from the innermost outwards, the first one named
 *    like a Fach ("Schule/Q1/Mathe/Analysis.pdf" -> Mathe);
 * 2. otherwise the Heft's own name ("Q3/Mathe.pdf" -> Mathe);
 * 3. otherwise the nearest folder the user assigned a Fach to by hand
 *    (from "Ohne Fach"), which covers everything below it.
 */
export function resolveSubject(
  filePath: string,
  subjects: SubjectRef[],
  manualFolders: Map<string, string>,
): ResolvedSubject {
  const byName = new Map<string, string>();
  for (const subject of subjects) byName.set(normalizeName(subject.name), subject.id);

  const folders: string[] = [];
  for (let folder = parentPath(filePath); folder !== ""; folder = parentPath(folder)) folders.push(folder);

  for (const folder of folders) {
    const match = byName.get(normalizeName(baseName(folder)));
    if (match) return { subjectId: match, source: "folder", folderPath: folder };
  }
  const own = byName.get(normalizeName(baseName(filePath)));
  if (own) return { subjectId: own, source: "name", folderPath: null };
  for (const folder of folders) {
    const manual = manualFolders.get(folder);
    if (manual) return { subjectId: manual, source: "manual", folderPath: folder };
  }
  return { subjectId: null, source: null, folderPath: null };
}
