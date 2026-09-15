import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as examPrepController from "./examPrep.controller.js";

// Nested unter /api/calendar-events/:eventId/exam-prep
export const examPrepRouter = Router({ mergeParams: true });
examPrepRouter.use(authGuard);

examPrepRouter.get("/", asyncHandler(examPrepController.get));
examPrepRouter.put("/", asyncHandler(examPrepController.save));
examPrepRouter.get("/candidates", asyncHandler(examPrepController.candidates));
