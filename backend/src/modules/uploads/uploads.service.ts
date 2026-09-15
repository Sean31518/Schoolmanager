import { ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export async function createUploadedFile(userId: string, file: Express.Multer.File) {
  if (!file) {
    throw new ValidationError("Keine Datei hochgeladen");
  }

  return prisma.uploadedFile.create({
    data: {
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: `${userId}/${file.filename}`,
    },
  });
}
