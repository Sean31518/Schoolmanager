import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { requireOwnedSectionType } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";

function parseGradeLevel(raw: string): number {
  const gradeLevel = Number(raw);
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 13) {
    throw new ValidationError("gradeLevel muss eine ganze Zahl zwischen 1 und 13 sein");
  }
  return gradeLevel;
}

export async function listNotes(userId: string, sectionTypeId: string) {
  await requireOwnedSectionType(userId, sectionTypeId);
  const notes = await prisma.note.findMany({
    where: { noteSectionTypeId: sectionTypeId },
    orderBy: { gradeLevel: "asc" },
  });
  return notes.map((note) => ({
    ...note,
    contentJson: JSON.parse(note.contentJson) as unknown,
  }));
}

export async function getNote(
  userId: string,
  sectionTypeId: string,
  gradeLevelRaw: string,
) {
  await requireOwnedSectionType(userId, sectionTypeId);
  const gradeLevel = parseGradeLevel(gradeLevelRaw);

  const note = await prisma.note.findUnique({
    where: {
      noteSectionTypeId_gradeLevel: { noteSectionTypeId: sectionTypeId, gradeLevel },
    },
  });
  if (!note) {
    throw new NotFoundError("Für diese Klassenstufe existiert noch keine Notiz");
  }
  return { ...note, contentJson: JSON.parse(note.contentJson) as unknown };
}

export async function upsertNote(
  userId: string,
  sectionTypeId: string,
  gradeLevelRaw: string,
  contentJson: unknown,
) {
  await requireOwnedSectionType(userId, sectionTypeId);
  const gradeLevel = parseGradeLevel(gradeLevelRaw);
  const serialized = JSON.stringify(contentJson);

  const note = await prisma.note.upsert({
    where: {
      noteSectionTypeId_gradeLevel: { noteSectionTypeId: sectionTypeId, gradeLevel },
    },
    create: { noteSectionTypeId: sectionTypeId, gradeLevel, contentJson: serialized },
    update: { contentJson: serialized },
  });

  return { ...note, contentJson };
}

export async function deleteNote(
  userId: string,
  sectionTypeId: string,
  gradeLevelRaw: string,
) {
  await requireOwnedSectionType(userId, sectionTypeId);
  const gradeLevel = parseGradeLevel(gradeLevelRaw);

  await prisma.note.deleteMany({
    where: { noteSectionTypeId: sectionTypeId, gradeLevel },
  });
}
