// middlewares/admin.middleware.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    console.log("No user found in request");
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.user.role !== "Team Leader") {
    console.log("User is not an admin:", req.user.role);
    return res.status(403).json({
      message: "Access denied. Admin only.",
    });
  }

  next();
};