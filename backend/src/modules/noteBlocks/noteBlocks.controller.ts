import type { Request, Response } from "express";
import * as noteBlocksService from "./noteBlocks.service.js";
import {
  createImageBlockSchema,
  createLinkBlockSchema,
  createPdfBlockSchema,
  createTextBlockSchema,
  createVideoBlockSchema,
  reorderBlocksSchema,
  updateBlockSchema,
} from "./noteBlocks.schema.js";

export async function list(req: Request, res: Response) {
  const blocks = await noteBlocksService.listBlocks(req.user!.id, req.params.noteId);
  res.json(blocks);
}

export async function createText(req: Request, res: Response) {
  const body = createTextBlockSchema.parse(req.body);
  const block = await noteBlocksService.createTextBlock(req.user!.id, req.params.noteId, body);
  res.status(201).json(block);
}

export async function createLink(req: Request, res: Response) {
  const body = createLinkBlockSchema.parse(req.body);
  const block = await noteBlocksService.createLinkBlock(req.user!.id, req.params.noteId, body);
  res.status(201).json(block);
}

export async function createVideo(req: Request, res: Response) {
  const body = createVideoBlockSchema.parse(req.body);
  const block = await noteBlocksService.createVideoBlock(req.user!.id, req.params.noteId, body);
  res.status(201).json(block);
}

export async function createImage(req: Request, res: Response) {
  const body = createImageBlockSchema.parse(req.body);
  const block = await noteBlocksService.createImageBlock(req.user!.id, req.params.noteId, body);
  res.status(201).json(block);
}

export async function createPdf(req: Request, res: Response) {
  const body = createPdfBlockSchema.parse(req.body);
  const blocks = await noteBlocksService.createPdfBlocks(req.user!.id, req.params.noteId, body);
  res.status(201).json(blocks);
}

export async function reorder(req: Request, res: Response) {
  const body = reorderBlocksSchema.parse(req.body);
  const blocks = await noteBlocksService.reorderBlocks(req.user!.id, req.params.noteId, body);
  res.json(blocks);
}

export async function update(req: Request, res: Response) {
  const body = updateBlockSchema.parse(req.body);
  const block = await noteBlocksService.updateBlock(req.user!.id, req.params.id, body);
  res.json(block);
}

export async function remove(req: Request, res: Response) {
  await noteBlocksService.deleteBlock(req.user!.id, req.params.id);
  res.status(204).send();
}
