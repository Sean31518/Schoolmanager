import { requireOwnedFile } from "../../lib/ownership.js";

export async function getOwnedFile(userId: string, fileId: string) {
  return requireOwnedFile(userId, fileId);
}
