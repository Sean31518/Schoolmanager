import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

export function createApp() {
  const app = express();

  app.use(cors({ credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/settings", settingsRouter);

  app.use(express.static(publicDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) res.status(404).send("Not found");
    });
  });

  app.use(errorHandler);

  return app;
}
