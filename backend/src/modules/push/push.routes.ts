import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as pushController from "./push.controller.js";

export const pushRouter = Router();

// Public by design - a VAPID public key is meant to be shared with clients.
// Synchronous (no async work), so no asyncHandler wrapper needed.
pushRouter.get("/vapid-public-key", pushController.vapidPublicKey);

pushRouter.use(authGuard);
pushRouter.get("/status", asyncHandler(pushController.status));
pushRouter.post("/subscribe", asyncHandler(pushController.subscribe));
pushRouter.post("/unsubscribe", asyncHandler(pushController.unsubscribe));
