import type { Request, Response } from "express";
import * as sectionTypesService from "./noteSectionTypes.service.js";
import {
  createSectionTypeSchema,
  reorderSectionTypesSchema,
  updateSectionTypeSchema,
} from "./noteSectionTypes.schema.js";

export async function list(req: Request, res: Response) {
  const sectionTypes = await sectionTypesService.listSectionTypes(
    req.user!.id,
    req.params.subjectId,
  );
  res.json(sectionTypes);
}

export async function create(req: Request, res: Response) {
  const body = createSectionTypeSchema.parse(req.body);
  const sectionType = await sectionTypesService.createSectionType(
    req.user!.id,
    req.params.subjectId,
    body,
  );
  res.status(201).json(sectionType);
}

export async function reorder(req: Request, res: Response) {
  const body = reorderSectionTypesSchema.parse(req.body);
  const sectionTypes = await sectionTypesService.reorderSectionTypes(
    req.user!.id,
    req.params.subjectId,
    body,
  );
  res.json(sectionTypes);
}

export async function update(req: Request, res: Response) {
  const body = updateSectionTypeSchema.parse(req.body);
  const sectionType = await sectionTypesService.updateSectionType(
    req.user!.id,
    req.params.id,
    body,
  );
  res.json(sectionType);
}

export async function remove(req: Request, res: Response) {
  await sectionTypesService.deleteSectionType(req.user!.id, req.params.id);
  res.status(204).send();
}
