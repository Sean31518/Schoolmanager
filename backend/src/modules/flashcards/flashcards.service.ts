import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { requireOwnedSubject } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import { linksInclude, syncLinks, withMappedLinks } from "../links/links.service.js";
import type {
  createDeckSchema,
  createFlashcardSchema,
  reviewFlashcardSchema,
  updateDeckSchema,
  updateFlashcardSchema,
} from "./flashcards.schema.js";

// Karteikarten live in self-made Stapel under a Fach; Hefte/pages are only
// linked from individual cards.

async function deckStats(deckIds: string[]) {
  const rows = await prisma.flashcard.groupBy({
    by: ["deckId", "state"],
    where: { deckId: { in: deckIds } },
    _count: { _all: true },
  });
  const stats = new Map<string, { total: number; known: number }>();
  for (const row of rows) {
    const entry = stats.get(row.deckId) ?? { total: 0, known: 0 };
    entry.total += row._count._all;
    if (row.state === "KNOWN") entry.known += row._count._all;
    stats.set(row.deckId, entry);
  }
  return stats;
}

/** All decks of the user, optionally only one Fach's, with card counts. */
export async function listDecks(userId: string, subjectId?: string) {
  if (subjectId) await requireOwnedSubject(userId, subjectId);
  const decks = await prisma.flashcardDeck.findMany({
    where: { userId, ...(subjectId ? { subjectId } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { subject: { select: { id: true, name: true, color: true } } },
  });
  const stats = await deckStats(decks.map((d) => d.id));
  return decks.map((deck) => ({
    ...deck,
    cardCount: stats.get(deck.id)?.total ?? 0,
    knownCount: stats.get(deck.id)?.known ?? 0,
  }));
}

export async function createDeck(userId: string, subjectId: string, data: z.infer<typeof createDeckSchema>) {
  await requireOwnedSubject(userId, subjectId);
  const count = await prisma.flashcardDeck.count({ where: { subjectId } });
  const deck = await prisma.flashcardDeck.create({
    data: { userId, subjectId, name: data.name, sortOrder: count },
    include: { subject: { select: { id: true, name: true, color: true } } },
  });
  return { ...deck, cardCount: 0, knownCount: 0 };
}

async function requireOwnedDeck(userId: string, deckId: string) {
  const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
  if (!deck) {
    throw new NotFoundError("Stapel nicht gefunden");
  }
  return deck;
}

export async function getDeck(userId: string, deckId: string) {
  await requireOwnedDeck(userId, deckId);
  const deck = await prisma.flashcardDeck.findUniqueOrThrow({
    where: { id: deckId },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      flashcards: { orderBy: { sortOrder: "asc" }, include: linksInclude },
    },
  });
  return { ...deck, flashcards: deck.flashcards.map(withMappedLinks) };
}

export async function updateDeck(userId: string, deckId: string, data: z.infer<typeof updateDeckSchema>) {
  await requireOwnedDeck(userId, deckId);
  if (data.subjectId) await requireOwnedSubject(userId, data.subjectId);
  await prisma.flashcardDeck.update({ where: { id: deckId }, data });
  const [deck] = (await listDecks(userId)).filter((d) => d.id === deckId);
  return deck;
}

export async function deleteDeck(userId: string, deckId: string) {
  await requireOwnedDeck(userId, deckId);
  await prisma.flashcardDeck.delete({ where: { id: deckId } });
}

async function requireOwnedFlashcard(userId: string, flashcardId: string) {
  const flashcard = await prisma.flashcard.findFirst({
    where: { id: flashcardId, deck: { userId } },
  });
  if (!flashcard) {
    throw new NotFoundError("Karteikarte nicht gefunden");
  }
  return flashcard;
}

async function getFlashcard(flashcardId: string) {
  const flashcard = await prisma.flashcard.findUniqueOrThrow({
    where: { id: flashcardId },
    include: linksInclude,
  });
  return withMappedLinks(flashcard);
}

export async function createFlashcard(
  userId: string,
  deckId: string,
  data: z.infer<typeof createFlashcardSchema>,
) {
  await requireOwnedDeck(userId, deckId);
  const count = await prisma.flashcard.count({ where: { deckId } });
  const flashcard = await prisma.flashcard.create({
    data: { deckId, question: data.question, answer: data.answer, sortOrder: count },
  });
  if (data.links) await syncLinks(userId, { flashcardId: flashcard.id }, data.links);
  return getFlashcard(flashcard.id);
}

export async function updateFlashcard(
  userId: string,
  flashcardId: string,
  data: z.infer<typeof updateFlashcardSchema>,
) {
  await requireOwnedFlashcard(userId, flashcardId);
  const { links, ...fields } = data;
  await prisma.flashcard.update({ where: { id: flashcardId }, data: fields });
  if (links) await syncLinks(userId, { flashcardId }, links);
  return getFlashcard(flashcardId);
}

export async function reviewFlashcard(
  userId: string,
  flashcardId: string,
  data: z.infer<typeof reviewFlashcardSchema>,
) {
  await requireOwnedFlashcard(userId, flashcardId);
  const state = data.result === "known" ? "KNOWN" : "LEARNING";
  await prisma.flashcard.update({
    where: { id: flashcardId },
    data: { state, lastReviewedAt: new Date() },
  });
  return getFlashcard(flashcardId);
}

export async function deleteFlashcard(userId: string, flashcardId: string) {
  await requireOwnedFlashcard(userId, flashcardId);
  await prisma.flashcard.delete({ where: { id: flashcardId } });
}
