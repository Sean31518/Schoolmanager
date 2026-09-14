import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as generalNotesController from "./generalNotes.controller.js";

export const generalNotesRouter = Router();
generalNotesRouter.use(authGuard);

generalNotesRouter.get("/", asyncHandler(generalNotesController.list));
generalNotesRouter.post("/", asyncHandler(generalNotesController.create));
generalNotesRouter.patch("/:id", asyncHandler(generalNotesController.update));
generalNotesRouter.delete("/:id", asyncHandler(generalNotesController.remove));
