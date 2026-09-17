import type { Request, Response } from "express";
import { subscribeSchema, unsubscribeSchema } from "./push.schema.js";
import * as pushService from "./push.service.js";

export function vapidPublicKey(_req: Request, res: Response) {
  res.json({
    publicKey: pushService.getVapidPublicKey(),
    configured: pushService.isPushConfigured(),
  });
}

export async function subscribe(req: Request, res: Response) {
  const body = subscribeSchema.parse(req.body);
  await pushService.saveSubscription(req.user!.id, body);
  res.status(201).json({ ok: true });
}

export async function unsubscribe(req: Request, res: Response) {
  const body = unsubscribeSchema.parse(req.body);
  await pushService.removeSubscription(req.user!.id, body.endpoint);
  res.status(204).send();
}

export async function status(req: Request, res: Response) {
  const active = await pushService.hasActiveSubscription(req.user!.id);
  res.json({ active, configured: pushService.isPushConfigured() });
}
