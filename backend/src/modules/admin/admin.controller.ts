import type { Request, Response } from "express";
import { getAppSettings, setRegistrationEnabled } from "../appSettings/appSettings.service.js";
import * as adminService from "./admin.service.js";
import { createUserSchema, updateAppSettingsSchema } from "./admin.schema.js";

export async function listUsers(_req: Request, res: Response) {
  const users = await adminService.listUsers();
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const body = createUserSchema.parse(req.body);
  const user = await adminService.createUser(body);
  res.status(201).json(user);
}

export async function deleteUser(req: Request, res: Response) {
  await adminService.deleteUser(req.user!.id, req.params.userId);
  res.status(204).send();
}

export async function getSettings(_req: Request, res: Response) {
  res.json(await getAppSettings());
}

export async function updateSettings(req: Request, res: Response) {
  const body = updateAppSettingsSchema.parse(req.body);
  res.json(await setRegistrationEnabled(body.registrationEnabled));
}
