import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as sectionTypesController from "./noteSectionTypes.controller.js";

// Nested unter /api/subjects/:subjectId/section-types
export const sectionTypesRouter = Router({ mergeParams: true });
sectionTypesRouter.use(authGuard);

sectionTypesRouter.get("/", asyncHandler(sectionTypesController.list));
sectionTypesRouter.post("/", asyncHandler(sectionTypesController.create));
sectionTypesRouter.patch("/reorder", asyncHandler(sectionTypesController.reorder));

// Standalone unter /api/section-types/:id
export const sectionTypeByIdRouter = Router();
sectionTypeByIdRouter.use(authGuard);

sectionTypeByIdRouter.patch("/:id", asyncHandler(sectionTypesController.update));
sectionTypeByIdRouter.delete("/:id", asyncHandler(sectionTypesController.remove));
sectionTypeByIdRouter.get("/:id/notes", asyncHandler(sectionTypesController.listNotes));
