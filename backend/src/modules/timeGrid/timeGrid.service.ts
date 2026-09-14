import type { z } from "zod";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createTimeGridSlotSchema,
  reorderTimeGridSlotsSchema,
  updateTimeGridSlotSchema,
} from "./timeGrid.schema.js";

export async function listTimeGridSlots(userId: string) {
  return prisma.timeGridSlot.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
}

export async function createTimeGridSlot(
  userId: string,
  data: z.infer<typeof createTimeGridSlotSchema>,
) {
  const count = await prisma.timeGridSlot.count({ where: { userId } });
  return prisma.timeGridSlot.create({ data: { ...data, userId, sortOrder: count } });
}

async function requireOwnedTimeGridSlot(userId: string, id: string) {
  const slot = await prisma.timeGridSlot.findFirst({ where: { id, userId } });
  if (!slot) {
    throw new NotFoundError("Zeitraster-Eintrag nicht gefunden");
  }
  return slot;
}

export async function updateTimeGridSlot(
  userId: string,
  id: string,
  data: z.infer<typeof updateTimeGridSlotSchema>,
) {
  await requireOwnedTimeGridSlot(userId, id);
  return prisma.timeGridSlot.update({ where: { id }, data });
}

export async function deleteTimeGridSlot(userId: string, id: string) {
  await requireOwnedTimeGridSlot(userId, id);
  await prisma.timeGridSlot.delete({ where: { id } });
}

export async function reorderTimeGridSlots(
  userId: string,
  data: z.infer<typeof reorderTimeGridSlotsSchema>,
) {
  const existing = await prisma.timeGridSlot.findMany({ where: { userId } });
  const existingIds = new Set(existing.map((s) => s.id));
  const providedIds = new Set(data.orderedIds);

  const sameSet =
    existingIds.size === providedIds.size &&
    [...existingIds].every((id) => providedIds.has(id));

  if (!sameSet) {
    throw new ValidationError(
      "orderedIds muss genau die vorhandenen Zeitraster-Einträge enthalten",
    );
  }

  await prisma.$transaction(
    data.orderedIds.map((id, index) =>
      prisma.timeGridSlot.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return prisma.timeGridSlot.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
}
