import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as appPasswordsController from "./appPasswords.controller.js";

export const appPasswordsRouter = Router();
appPasswordsRouter.use(authGuard);

appPasswordsRouter.get("/", asyncHandler(appPasswordsController.list));
appPasswordsRouter.post("/", asyncHandler(appPasswordsController.create));
appPasswordsRouter.delete("/:id", asyncHandler(appPasswordsController.remove));
