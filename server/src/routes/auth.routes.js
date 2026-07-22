import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { isValidEmail, isValidPassword } from "../utils/validators.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

function toPublicUser(user) {
  return { id: String(user._id), email: user.email };
}

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({
        error: "Please provide a valid email and a password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash });

    const token = signToken(user._id);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user._id);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  // Stateless JWT: nothing to invalidate server-side today. Kept as a real
  // endpoint (rather than handled purely client-side) so token revocation
  // can be added later without an API shape change.
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
