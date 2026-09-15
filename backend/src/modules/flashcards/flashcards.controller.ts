import type { Request, Response } from "express";
import * as flashcardsService from "./flashcards.service.js";
import {
  createFlashcardSchema,
  reviewFlashcardSchema,
  updateFlashcardSchema,
} from "./flashcards.schema.js";

export async function list(req: Request, res: Response) {
  const flashcards = await flashcardsService.listFlashcards(req.user!.id, req.params.topicId);
  res.json(flashcards);
}

export async function create(req: Request, res: Response) {
  const body = createFlashcardSchema.parse(req.body);
  const flashcard = await flashcardsService.createFlashcard(
    req.user!.id,
    req.params.topicId,
    body,
  );
  res.status(201).json(flashcard);
}

export async function update(req: Request, res: Response) {
  const body = updateFlashcardSchema.parse(req.body);
  const flashcard = await flashcardsService.updateFlashcard(req.user!.id, req.params.id, body);
  res.json(flashcard);
}

export async function review(req: Request, res: Response) {
  const body = reviewFlashcardSchema.parse(req.body);
  const flashcard = await flashcardsService.reviewFlashcard(req.user!.id, req.params.id, body);
  res.json(flashcard);
}

export async function remove(req: Request, res: Response) {
  await flashcardsService.deleteFlashcard(req.user!.id, req.params.id);
  res.status(204).send();
}
