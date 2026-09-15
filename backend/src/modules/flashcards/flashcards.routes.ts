import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as flashcardsController from "./flashcards.controller.js";

// Nested unter /api/topics/:topicId/flashcards
export const flashcardsRouter = Router({ mergeParams: true });
flashcardsRouter.use(authGuard);

flashcardsRouter.get("/", asyncHandler(flashcardsController.list));
flashcardsRouter.post("/", asyncHandler(flashcardsController.create));

// Standalone unter /api/flashcards/:id
export const flashcardByIdRouter = Router();
flashcardByIdRouter.use(authGuard);

flashcardByIdRouter.patch("/:id", asyncHandler(flashcardsController.update));
flashcardByIdRouter.patch("/:id/review", asyncHandler(flashcardsController.review));
flashcardByIdRouter.delete("/:id", asyncHandler(flashcardsController.remove));
