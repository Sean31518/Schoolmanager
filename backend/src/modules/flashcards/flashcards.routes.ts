import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as flashcardsController from "./flashcards.controller.js";

// Mounted at /api/subjects/:subjectId/decks
export const subjectDecksRouter = Router({ mergeParams: true });
subjectDecksRouter.use(authGuard);
subjectDecksRouter.get("/", asyncHandler(flashcardsController.listSubjectDecks));
subjectDecksRouter.post("/", asyncHandler(flashcardsController.createDeck));

// Mounted at /api/decks
export const decksRouter = Router();
decksRouter.use(authGuard);
decksRouter.get("/", asyncHandler(flashcardsController.listDecks));
decksRouter.get("/:id", asyncHandler(flashcardsController.getDeck));
decksRouter.patch("/:id", asyncHandler(flashcardsController.updateDeck));
decksRouter.delete("/:id", asyncHandler(flashcardsController.deleteDeck));
decksRouter.post("/:id/flashcards", asyncHandler(flashcardsController.createFlashcard));

// Mounted at /api/flashcards
export const flashcardsRouter = Router();
flashcardsRouter.use(authGuard);
flashcardsRouter.patch("/:id", asyncHandler(flashcardsController.updateFlashcard));
flashcardsRouter.post("/:id/review", asyncHandler(flashcardsController.reviewFlashcard));
flashcardsRouter.delete("/:id", asyncHandler(flashcardsController.deleteFlashcard));
