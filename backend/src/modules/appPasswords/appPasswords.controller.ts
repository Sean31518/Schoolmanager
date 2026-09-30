import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import * as appPasswordsService from "./appPasswords.service.js";
import { createAppPasswordSchema } from "./appPasswords.schema.js";

export async function list(req: Request, res: Response) {
  const passwords = await appPasswordsService.listAppPasswords(req.user!.id);
  res.json({ davUrl: env.DAV_PUBLIC_URL ?? null, passwords });
}

export async function create(req: Request, res: Response) {
  const body = createAppPasswordSchema.parse(req.body);
  const created = await appPasswordsService.createAppPassword(req.user!.id, body.label);
  res.status(201).json(created);
}

export async function remove(req: Request, res: Response) {
  await appPasswordsService.deleteAppPassword(req.user!.id, req.params.id);
  res.status(204).send();
}
