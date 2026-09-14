import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as timetableController from "./timetable.controller.js";

export const timetableRouter = Router();
timetableRouter.use(authGuard);

timetableRouter.get("/", asyncHandler(timetableController.get));
timetableRouter.put("/:weekday/:timeGridSlotId", asyncHandler(timetableController.upsert));
timetableRouter.delete("/:weekday/:timeGridSlotId", asyncHandler(timetableController.remove));
