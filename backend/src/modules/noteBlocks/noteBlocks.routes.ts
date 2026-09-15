import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as noteBlocksController from "./noteBlocks.controller.js";

// Nested unter /api/notes/:noteId/blocks
export const noteBlocksRouter = Router({ mergeParams: true });
noteBlocksRouter.use(authGuard);

noteBlocksRouter.get("/", asyncHandler(noteBlocksController.list));
noteBlocksRouter.post("/text", asyncHandler(noteBlocksController.createText));
noteBlocksRouter.post("/link", asyncHandler(noteBlocksController.createLink));
noteBlocksRouter.post("/video", asyncHandler(noteBlocksController.createVideo));
noteBlocksRouter.post("/pdf", asyncHandler(noteBlocksController.createPdf));
noteBlocksRouter.patch("/reorder", asyncHandler(noteBlocksController.reorder));

// Standalone unter /api/blocks/:id
export const blockByIdRouter = Router();
blockByIdRouter.use(authGuard);

blockByIdRouter.patch("/:id", asyncHandler(noteBlocksController.update));
blockByIdRouter.delete("/:id", asyncHandler(noteBlocksController.remove));
