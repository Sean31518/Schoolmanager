import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as homeworkController from "./homework.controller.js";

export const homeworkRouter = Router();
homeworkRouter.use(authGuard);

homeworkRouter.get("/", asyncHandler(homeworkController.list));
homeworkRouter.post("/", asyncHandler(homeworkController.create));
homeworkRouter.patch("/:id", asyncHandler(homeworkController.update));
homeworkRouter.delete("/:id", asyncHandler(homeworkController.remove));
