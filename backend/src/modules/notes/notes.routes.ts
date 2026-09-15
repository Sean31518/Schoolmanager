import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as notesController from "./notes.controller.js";

// Nested unter /api/topics/:topicId/notes
export const notesRouter = Router({ mergeParams: true });
notesRouter.use(authGuard);

notesRouter.get("/", asyncHandler(notesController.list));
notesRouter.post("/", asyncHandler(notesController.create));
notesRouter.patch("/reorder", asyncHandler(notesController.reorder));

// Standalone unter /api/notes/:id
export const noteByIdRouter = Router();
noteByIdRouter.use(authGuard);

noteByIdRouter.get("/:id", asyncHandler(notesController.getOne));
noteByIdRouter.patch("/:id", asyncHandler(notesController.update));
noteByIdRouter.delete("/:id", asyncHandler(notesController.remove));
