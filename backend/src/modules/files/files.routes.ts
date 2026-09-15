import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as filesController from "./files.controller.js";
import { fileAuthGuard } from "./files.middleware.js";

export const filesRouter = Router();
filesRouter.use(fileAuthGuard);

filesRouter.get("/:id", asyncHandler(filesController.stream));
