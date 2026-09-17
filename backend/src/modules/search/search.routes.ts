import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as searchController from "./search.controller.js";

export const searchRouter = Router();
searchRouter.use(authGuard);

searchRouter.get("/", asyncHandler(searchController.get));
