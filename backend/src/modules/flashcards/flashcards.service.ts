import type { z } from "zod";
import { requireOwnedFlashcard, requireOwnedTopic } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createFlashcardSchema,
  reviewFlashcardSchema,
  updateFlashcardSchema,
} from "./flashcards.schema.js";

export async function listFlashcards(userId: string, topicId: string) {
  await requireOwnedTopic(userId, topicId);
  return prisma.flashcard.findMany({
    where: { topicId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createFlashcard(
  userId: string,
  topicId: string,
  data: z.infer<typeof createFlashcardSchema>,
) {
  await requireOwnedTopic(userId, topicId);
  const count = await prisma.flashcard.count({ where: { topicId } });
  return prisma.flashcard.create({ data: { ...data, topicId, sortOrder: count } });
}

export async function updateFlashcard(
  userId: string,
  flashcardId: string,
  data: z.infer<typeof updateFlashcardSchema>,
) {
  await requireOwnedFlashcard(userId, flashcardId);
  return prisma.flashcard.update({ where: { id: flashcardId }, data });
}

export async function reviewFlashcard(
  userId: string,
  flashcardId: string,
  data: z.infer<typeof reviewFlashcardSchema>,
) {
  const flashcard = await requireOwnedFlashcard(userId, flashcardId);
  const state = data.result === "known" ? "KNOWN" : "LEARNING";
  return prisma.flashcard.update({
    where: { id: flashcard.id },
    data: { state, lastReviewedAt: new Date() },
  });
}

export async function deleteFlashcard(userId: string, flashcardId: string) {
  await requireOwnedFlashcard(userId, flashcardId);
  await prisma.flashcard.delete({ where: { id: flashcardId } });
}
