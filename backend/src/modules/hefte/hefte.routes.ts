import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as hefteController from "./hefte.controller.js";

export const hefteRouter = Router();
// Before authGuard: carries its own view token.
hefteRouter.get("/:id/pdf", asyncHandler(hefteController.pdf));
hefteRouter.use(authGuard);

hefteRouter.get("/", asyncHandler(hefteController.list));
hefteRouter.put("/folders/subject", asyncHandler(hefteController.assignFolderSubject));
hefteRouter.get("/:id", asyncHandler(hefteController.getOne));
hefteRouter.patch("/:id", asyncHandler(hefteController.update));
hefteRouter.post("/:id/view-url", asyncHandler(hefteController.viewUrl));

export const linksRouter = Router();
linksRouter.use(authGuard);

linksRouter.post("/:id/confirm", asyncHandler(hefteController.confirm));
