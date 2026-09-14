import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as notesController from "./notes.controller.js";

// Nested unter /api/section-types/:sectionTypeId/notes
export const notesRouter = Router({ mergeParams: true });
notesRouter.use(authGuard);

notesRouter.get("/", asyncHandler(notesController.list));
notesRouter.get("/:gradeLevel", asyncHandler(notesController.getOne));
notesRouter.put("/:gradeLevel", asyncHandler(notesController.upsert));
notesRouter.delete("/:gradeLevel", asyncHandler(notesController.remove));
