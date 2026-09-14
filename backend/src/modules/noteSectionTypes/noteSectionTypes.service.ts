import type { z } from "zod";
import { ConflictError, ValidationError } from "../../lib/errors.js";
import { requireOwnedSectionType, requireOwnedSubject } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createSectionTypeSchema,
  reorderSectionTypesSchema,
  updateSectionTypeSchema,
} from "./noteSectionTypes.schema.js";

export async function listSectionTypes(userId: string, subjectId: string) {
  await requireOwnedSubject(userId, subjectId);
  return prisma.noteSectionType.findMany({
    where: { subjectId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createSectionType(
  userId: string,
  subjectId: string,
  data: z.infer<typeof createSectionTypeSchema>,
) {
  await requireOwnedSubject(userId, subjectId);

  const existing = await prisma.noteSectionType.findUnique({
    where: { subjectId_name: { subjectId, name: data.name } },
  });
  if (existing) {
    throw new ConflictError("Ein Notizbereich mit diesem Namen existiert bereits");
  }

  const count = await prisma.noteSectionType.count({ where: { subjectId } });
  return prisma.noteSectionType.create({
    data: { ...data, subjectId, sortOrder: count },
  });
}

export async function updateSectionType(
  userId: string,
  sectionTypeId: string,
  data: z.infer<typeof updateSectionTypeSchema>,
) {
  const sectionType = await requireOwnedSectionType(userId, sectionTypeId);

  if (data.name && data.name !== sectionType.name) {
    const existing = await prisma.noteSectionType.findUnique({
      where: { subjectId_name: { subjectId: sectionType.subjectId, name: data.name } },
    });
    if (existing) {
      throw new ConflictError("Ein Notizbereich mit diesem Namen existiert bereits");
    }
  }

  return prisma.noteSectionType.update({ where: { id: sectionTypeId }, data });
}

export async function deleteSectionType(userId: string, sectionTypeId: string) {
  await requireOwnedSectionType(userId, sectionTypeId);
  await prisma.noteSectionType.delete({ where: { id: sectionTypeId } });
}

export async function reorderSectionTypes(
  userId: string,
  subjectId: string,
  data: z.infer<typeof reorderSectionTypesSchema>,
) {
  await requireOwnedSubject(userId, subjectId);

  const existing = await prisma.noteSectionType.findMany({ where: { subjectId } });
  const existingIds = new Set(existing.map((s) => s.id));
  const providedIds = new Set(data.orderedIds);

  const sameSet =
    existingIds.size === providedIds.size &&
    [...existingIds].every((id) => providedIds.has(id));

  if (!sameSet) {
    throw new ValidationError(
      "orderedIds muss genau die vorhandenen Notizbereiche dieses Fachs enthalten",
    );
  }

  await prisma.$transaction(
    data.orderedIds.map((id, index) =>
      prisma.noteSectionType.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return prisma.noteSectionType.findMany({
    where: { subjectId },
    orderBy: { sortOrder: "asc" },
  });
}
