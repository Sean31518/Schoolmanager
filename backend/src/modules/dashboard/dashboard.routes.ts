import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as dashboardController from "./dashboard.controller.js";

export const dashboardRouter = Router();
dashboardRouter.use(authGuard);

dashboardRouter.get("/", asyncHandler(dashboardController.get));
