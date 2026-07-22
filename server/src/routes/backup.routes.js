import { Router } from "express";
import { Backup } from "../models/Backup.js";

const router = Router();

function isValidSnapshot(body) {
  return (
    body &&
    typeof body === "object" &&
    Array.isArray(body.categories) &&
    Array.isArray(body.cards) &&
    Array.isArray(body.starColors) &&
    typeof body.activeStarColorId === "string"
  );
}

router.get("/", async (req, res, next) => {
  try {
    const backup = await Backup.findOne({ userId: req.userId });
    if (!backup) return res.status(404).json({ error: "No backup" });
    res.json({ data: backup.data, updatedAt: backup.updatedAt });
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    if (!isValidSnapshot(req.body)) {
      return res.status(400).json({ error: "Malformed backup payload" });
    }

    const backup = await Backup.findOneAndUpdate(
      { userId: req.userId },
      { data: req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({ updatedAt: backup.updatedAt });
  } catch (err) {
    next(err);
  }
});

export default router;
