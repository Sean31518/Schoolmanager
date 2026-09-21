import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { adminGuard } from "../../middleware/adminGuard.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as adminController from "./admin.controller.js";

export const adminRouter = Router();
adminRouter.use(authGuard, adminGuard);

adminRouter.get("/users", asyncHandler(adminController.listUsers));
adminRouter.post("/users", asyncHandler(adminController.createUser));
adminRouter.patch("/users/:userId", asyncHandler(adminController.updateUser));
adminRouter.delete("/users/:userId", asyncHandler(adminController.deleteUser));
adminRouter.get("/settings", asyncHandler(adminController.getSettings));
adminRouter.patch("/settings", asyncHandler(adminController.updateSettings));
