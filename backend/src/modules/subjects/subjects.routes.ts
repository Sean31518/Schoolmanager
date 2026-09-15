import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { sectionTypesRouter } from "../noteSectionTypes/noteSectionTypes.routes.js";
import * as subjectsController from "./subjects.controller.js";

export const subjectsRouter = Router();
subjectsRouter.use(authGuard);

subjectsRouter.get("/", asyncHandler(subjectsController.list));
subjectsRouter.post("/", asyncHandler(subjectsController.create));
subjectsRouter.get("/:id", asyncHandler(subjectsController.getOne));
subjectsRouter.patch("/:id", asyncHandler(subjectsController.update));
subjectsRouter.delete("/:id", asyncHandler(subjectsController.remove));
subjectsRouter.get("/:subjectId/notes", asyncHandler(subjectsController.listNotes));

subjectsRouter.use("/:subjectId/section-types", sectionTypesRouter);
