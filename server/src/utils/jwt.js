import jwt from "jsonwebtoken";

const EXPIRES_IN = "30d";

export function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable");
  return jwt.sign({ sub: String(userId) }, secret, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable");
  return jwt.verify(token, secret);
}
