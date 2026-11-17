import "dotenv/config";
import express from "express";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repositoryAnalyticsHandler, searchHandler, statusHandler } from "./api.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");
const token = process.env.GITHUB_TOKEN?.trim();

app.disable("x-powered-by");
const apiRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});
app.use("/api", apiRateLimit);

app.get("/api/status", statusHandler);
app.get("/api/search", searchHandler);
app.get("/api/repos/:owner/:repo/analytics", repositoryAnalyticsHandler);

app.use(express.static(path.join(projectRoot, "dist"), { index: false }));
app.get(/.*/, (_request, response, next) => {
  response.sendFile(path.join(projectRoot, "dist", "index.html"), (error) => {
    if (error) next();
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`GitHub analytics server listening on http://localhost:${port}`);
  console.log(`GitHub token ${token ? "configured" : "not configured (unauthenticated API limits)"}`);
});
