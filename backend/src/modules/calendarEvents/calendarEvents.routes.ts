import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as calendarEventsController from "./calendarEvents.controller.js";

export const calendarEventsRouter = Router();
calendarEventsRouter.use(authGuard);

calendarEventsRouter.get("/", asyncHandler(calendarEventsController.list));
calendarEventsRouter.post("/", asyncHandler(calendarEventsController.create));
calendarEventsRouter.post(
  "/import-holidays",
  asyncHandler(calendarEventsController.importHolidays),
);
calendarEventsRouter.patch("/:id", asyncHandler(calendarEventsController.update));
calendarEventsRouter.delete("/:id", asyncHandler(calendarEventsController.remove));
