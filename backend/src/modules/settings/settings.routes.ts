import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import * as settingsService from "./settings.service.js";
import { updateSettingsSchema } from "./settings.schema.js";

export const settingsRouter = Router();

settingsRouter.use(authGuard);

settingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettings(req.user!.id);
    res.json(settings);
  }),
);

settingsRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const body = updateSettingsSchema.parse(req.body);
    const settings = await settingsService.updateSettings(req.user!.id, body);
    res.json(settings);
  }),
);

settingsRouter.delete(
  "/iserv",
  asyncHandler(async (req, res) => {
    const settings = await settingsService.disconnectIserv(req.user!.id);
    res.json(settings);
  }),
);

settingsRouter.post(
  "/iserv/sync",
  asyncHandler(async (req, res) => {
    const settings = await settingsService.triggerIservSync(req.user!.id);
    res.json(settings);
  }),
);
