import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as exportController from "./export.controller.js";

export const exportRouter = Router();
exportRouter.use(authGuard);

exportRouter.get("/", asyncHandler(exportController.exportAll));
