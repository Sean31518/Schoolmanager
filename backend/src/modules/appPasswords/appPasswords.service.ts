import { createHash, randomInt } from "node:crypto";
import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

// No 0/o/1/l - the password gets typed by hand into Goodnotes on an iPad.
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const GROUPS = 5;
const GROUP_LENGTH = 4;
// ~100 bits of entropy: far beyond brute-forcing, which is what makes a
// plain SHA-256 hash (instead of argon2) safe to store.
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

function generateToken() {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    for (let i = 0; i < GROUP_LENGTH; i++) group += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(group);
  }
  return groups.join("-");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token.trim().toLowerCase()).digest("hex");
}

const listSelect = { id: true, label: true, createdAt: true, lastUsedAt: true } as const;

export async function listAppPasswords(userId: string) {
  return prisma.appPassword.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: listSelect,
  });
}

/** The plaintext password is only ever returned here, once. */
export async function createAppPassword(userId: string, label: string) {
  const password = generateToken();
  const record = await prisma.appPassword.create({
    data: { userId, label, tokenHash: hashToken(password) },
    select: listSelect,
  });
  return { ...record, password };
}

export async function deleteAppPassword(userId: string, id: string) {
  const record = await prisma.appPassword.findFirst({ where: { id, userId } });
  if (!record) {
    throw new NotFoundError("App-Passwort nicht gefunden");
  }
  await prisma.appPassword.delete({ where: { id } });
}

/** WebDAV Basic auth: username is the account's email, password an app
 * password of that account. Returns the user id, or null. */
export async function verifyAppPassword(email: string, password: string) {
  const record = await prisma.appPassword.findUnique({
    where: { tokenHash: hashToken(password) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!record || record.user.email.toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }
  // A backup run makes hundreds of requests - don't write on every one.
  const now = Date.now();
  if (!record.lastUsedAt || now - record.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
    await prisma.appPassword.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date(now) },
    });
  }
  return record.user.id;
}
