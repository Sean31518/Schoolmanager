import webpush from "web-push";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { subscribeSchema } from "./push.schema.js";
import type { z } from "zod";

const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export function isPushConfigured() {
  return configured;
}

export function getVapidPublicKey() {
  return env.VAPID_PUBLIC_KEY ?? null;
}

export async function saveSubscription(
  userId: string,
  subscription: z.infer<typeof subscribeSchema>,
) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function hasActiveSubscription(userId: string) {
  const count = await prisma.pushSubscription.count({ where: { userId } });
  return count > 0;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendToUser(userId: string, payload: PushPayload) {
  if (!configured) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Browser revoked/expired this subscription - stop trying it.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    }),
  );
}
