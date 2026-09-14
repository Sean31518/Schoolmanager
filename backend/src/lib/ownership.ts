import { NotFoundError } from "./errors.js";
import { prisma } from "./prisma.js";

export async function requireOwnedSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
  return subject;
}

export async function requireOwnedSectionType(userId: string, sectionTypeId: string) {
  const sectionType = await prisma.noteSectionType.findFirst({
    where: { id: sectionTypeId, subject: { userId } },
  });
  if (!sectionType) {
    throw new NotFoundError("Notizbereich nicht gefunden");
  }
  return sectionType;
}
