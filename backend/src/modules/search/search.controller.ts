import type { Request, Response } from "express";
import { searchQuerySchema } from "./search.schema.js";
import { search } from "./search.service.js";

export async function get(req: Request, res: Response) {
  const { q } = searchQuerySchema.parse(req.query);
  const results = await search(req.user!.id, q);
  res.json(results);
}
