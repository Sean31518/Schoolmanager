import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as hefteController from "./hefte.controller.js";

export const hefteRouter = Router();
hefteRouter.use(authGuard);

hefteRouter.get("/", asyncHandler(hefteController.list));
hefteRouter.put("/folders/subject", asyncHandler(hefteController.assignFolderSubject));
hefteRouter.get("/:id", asyncHandler(hefteController.getOne));
hefteRouter.patch("/:id", asyncHandler(hefteController.update));
hefteRouter.get("/:id/pdf", asyncHandler(hefteController.pdf));

export const linksRouter = Router();
linksRouter.use(authGuard);

linksRouter.post("/:id/confirm", asyncHandler(hefteController.confirm));
