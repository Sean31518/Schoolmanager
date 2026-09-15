import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as topicsController from "./topics.controller.js";

// Nested unter /api/section-types/:sectionTypeId/topics
export const topicsRouter = Router({ mergeParams: true });
topicsRouter.use(authGuard);

topicsRouter.get("/", asyncHandler(topicsController.list));
topicsRouter.post("/", asyncHandler(topicsController.create));
topicsRouter.patch("/reorder", asyncHandler(topicsController.reorder));

// Standalone unter /api/topics/:id
export const topicByIdRouter = Router();
topicByIdRouter.use(authGuard);

topicByIdRouter.patch("/:id", asyncHandler(topicsController.update));
topicByIdRouter.delete("/:id", asyncHandler(topicsController.remove));
