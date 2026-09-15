import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as uploadsController from "./uploads.controller.js";
import { upload } from "./uploads.middleware.js";

export const uploadsRouter = Router();
uploadsRouter.use(authGuard);

uploadsRouter.post("/", upload.single("file"), asyncHandler(uploadsController.create));
