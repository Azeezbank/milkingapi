import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { JwtPayload } from "jsonwebtoken";


// GET all users
export const getAllusers = async (req: AuthRequest, res: Response) => {
  try {
    // if (req.user?.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden: Admins only" });
    // }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// GET single user
export const getSingleUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // if (req.user?.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden: Admins only" });
    // }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
        console.error('User not found')
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// PUT update user
export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, username, role } = req.body;

  try {

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, phone, username, role },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
      },
    });

    res.status(200).json({ user: updatedUser });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") { // Prisma unique constraint error
      return res.status(400).json({ message: "Email, phone or username already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
};


// GET current logged-in user
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)?.id;
    if (!userId) {
        console.error('Not authenticated')
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        superRole: true,
      },
    });

    if (!user) {
        console.error('User not found')
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};