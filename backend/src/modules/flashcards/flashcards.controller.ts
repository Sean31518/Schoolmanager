import type { Request, Response } from "express";
import { z } from "zod";
import * as flashcardsService from "./flashcards.service.js";
import {
  createDeckSchema,
  createFlashcardSchema,
  reviewFlashcardSchema,
  updateDeckSchema,
  updateFlashcardSchema,
} from "./flashcards.schema.js";

const listDecksQuerySchema = z.object({ subjectId: z.string().optional() });

export async function listDecks(req: Request, res: Response) {
  const query = listDecksQuerySchema.parse(req.query);
  res.json(await flashcardsService.listDecks(req.user!.id, query.subjectId));
}

export async function listSubjectDecks(req: Request, res: Response) {
  res.json(await flashcardsService.listDecks(req.user!.id, req.params.subjectId));
}

export async function createDeck(req: Request, res: Response) {
  const body = createDeckSchema.parse(req.body);
  res.status(201).json(await flashcardsService.createDeck(req.user!.id, req.params.subjectId, body));
}

export async function getDeck(req: Request, res: Response) {
  res.json(await flashcardsService.getDeck(req.user!.id, req.params.id));
}

export async function updateDeck(req: Request, res: Response) {
  const body = updateDeckSchema.parse(req.body);
  res.json(await flashcardsService.updateDeck(req.user!.id, req.params.id, body));
}

export async function deleteDeck(req: Request, res: Response) {
  await flashcardsService.deleteDeck(req.user!.id, req.params.id);
  res.status(204).send();
}

export async function createFlashcard(req: Request, res: Response) {
  const body = createFlashcardSchema.parse(req.body);
  res.status(201).json(await flashcardsService.createFlashcard(req.user!.id, req.params.id, body));
}

export async function updateFlashcard(req: Request, res: Response) {
  const body = updateFlashcardSchema.parse(req.body);
  res.json(await flashcardsService.updateFlashcard(req.user!.id, req.params.id, body));
}

export async function reviewFlashcard(req: Request, res: Response) {
  const body = reviewFlashcardSchema.parse(req.body);
  res.json(await flashcardsService.reviewFlashcard(req.user!.id, req.params.id, body));
}

export async function deleteFlashcard(req: Request, res: Response) {
  await flashcardsService.deleteFlashcard(req.user!.id, req.params.id);
  res.status(204).send();
}
