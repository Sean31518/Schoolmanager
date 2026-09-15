import type { z } from "zod";
import { ValidationError } from "../../lib/errors.js";
import { requireOwnedSectionType, requireOwnedTopic } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createTopicSchema,
  reorderTopicsSchema,
  updateTopicSchema,
} from "./topics.schema.js";

export async function listTopics(userId: string, sectionTypeId: string) {
  await requireOwnedSectionType(userId, sectionTypeId);
  return prisma.topic.findMany({
    where: { noteSectionTypeId: sectionTypeId },
    orderBy: { sortOrder: "asc" },
    include: { notes: { select: { id: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export async function createTopic(
  userId: string,
  sectionTypeId: string,
  data: z.infer<typeof createTopicSchema>,
) {
  await requireOwnedSectionType(userId, sectionTypeId);
  const count = await prisma.topic.count({ where: { noteSectionTypeId: sectionTypeId } });
  return prisma.topic.create({
    data: {
      noteSectionTypeId: sectionTypeId,
      name: data.name,
      gradeLevel: data.gradeLevel ?? null,
      sortOrder: count,
    },
  });
}

export async function updateTopic(
  userId: string,
  topicId: string,
  data: z.infer<typeof updateTopicSchema>,
) {
  await requireOwnedTopic(userId, topicId);
  return prisma.topic.update({ where: { id: topicId }, data });
}

export async function deleteTopic(userId: string, topicId: string) {
  await requireOwnedTopic(userId, topicId);
  await prisma.topic.delete({ where: { id: topicId } });
}

export async function reorderTopics(
  userId: string,
  sectionTypeId: string,
  data: z.infer<typeof reorderTopicsSchema>,
) {
  await requireOwnedSectionType(userId, sectionTypeId);

  const existing = await prisma.topic.findMany({ where: { noteSectionTypeId: sectionTypeId } });
  const existingIds = new Set(existing.map((t) => t.id));
  const providedIds = new Set(data.orderedIds);

  const sameSet =
    existingIds.size === providedIds.size &&
    [...existingIds].every((id) => providedIds.has(id));

  if (!sameSet) {
    throw new ValidationError(
      "orderedIds muss genau die vorhandenen Themen dieses Notizbereichs enthalten",
    );
  }

  await prisma.$transaction(
    data.orderedIds.map((id, index) =>
      prisma.topic.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return prisma.topic.findMany({
    where: { noteSectionTypeId: sectionTypeId },
    orderBy: { sortOrder: "asc" },
  });
}
