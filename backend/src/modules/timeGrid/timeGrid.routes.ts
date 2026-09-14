import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as timeGridController from "./timeGrid.controller.js";

export const timeGridRouter = Router();
timeGridRouter.use(authGuard);

timeGridRouter.get("/", asyncHandler(timeGridController.list));
timeGridRouter.post("/", asyncHandler(timeGridController.create));
timeGridRouter.patch("/reorder", asyncHandler(timeGridController.reorder));
timeGridRouter.patch("/:id", asyncHandler(timeGridController.update));
timeGridRouter.delete("/:id", asyncHandler(timeGridController.remove));
