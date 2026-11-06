import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user || !req.user.active) return res.status(401).json({ message: "Account unavailable" });
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}
export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "Insufficient permissions" });
