import jwt from "jsonwebtoken";
import { HttpError } from "../utils/errors.js";

export const COOKIE = "pp_token";
const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};
export const cookieOptions = () => ({
  httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", maxAge: 7 * 24 * 3600 * 1000, path: "/",
});
export const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, secret(), { expiresIn: "7d" });

export function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, "AUTH_REQUIRED", "Please log in to continue.");
  try { req.user = jwt.verify(token, secret()); } catch { throw new HttpError(401, "AUTH_REQUIRED", "Your session ended. Please log in again."); }
  next();
}
// Server-side role check: the role comes from the signed token, never from the request body.
export const requireRole = (role) => (req, _res, next) => {
  if (req.user?.role !== role) throw new HttpError(403, "FORBIDDEN", "This area is for grown-up admins only.");
  next();
};
