import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.routes.js";
import backupRoutes from "./routes/backup.routes.js";

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, health checks, server-to-server) is allowed;
      // browser requests always send one and are checked against the allowlist.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "2mb" }));

// Registered before the DB-connect middleware so it works as a pure
// process-is-alive check, independent of Mongo connectivity.
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/backup", requireAuth, backupRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? (err.message === "Not allowed by CORS" ? 403 : 500);
  res.status(status).json({ error: err.message ?? "Server error" });
});

export default app;
